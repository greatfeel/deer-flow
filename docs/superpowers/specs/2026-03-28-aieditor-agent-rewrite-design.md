# AiEditor Agent Rewrite Design

## Overview

Enable text rewriting via the main LangGraph Agent (`lead_agent`) when users select text in AiEditor and click the "AI > Improve Writing" context menu. Uses AiEditor's built-in `CustomAiModelConfig` to route AI requests through a Next.js API Route that translates between AiEditor's SSE protocol and LangGraph's streaming protocol.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AiEditor (Browser)                                         │
│                                                             │
│  Select text → Bubble menu "人工智能 → 改进写作"              │
│       │                                                     │
│       ▼                                                     │
│  CustomAiModelConfig                                        │
│    wrapPayload(selectedText + prompt)                       │
│       │                                                     │
│       ▼  SSE stream                                         │
│  ┌──────────────────┐                                       │
│  │ parseMessage()   │ ◄── SSE events ──┐                    │
│  │ → AiEditor built │                   │                    │
│  │   -in result UI  │                   │                    │
│  └──────────────────┘                   │                    │
└─────────────────────────────────────────│────────────────────┘
                                          │
                      ┌───────────────────┘
                      │  SSE response
                      │
         ┌────────────┴────────────┐
         │  /api/editor/rewrite    │   ← Next.js API Route
         │  (Protocol translator)  │
         │                         │
         │  1. Create thread       │
         │  2. Submit to agent     │
         │  3. Translate LangGraph │
         │     stream → SSE        │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  LangGraph Server       │
         │  (lead_agent)           │
         │  port 2024              │
         └─────────────────────────┘
```

## Approach: Custom Model Adapter (Option A)

Leverage AiEditor's `CustomAiModelConfig` to route AI requests to a Next.js API Route that acts as a protocol translator between AiEditor and LangGraph.

**Why this approach:**
- Minimal development effort — reuses AiEditor's built-in select → AI process → result display → replace flow
- Consistent UX with native AiEditor AI features (streaming output, replace confirmation)
- Clean separation — a single API Route handles all protocol translation
- Progressively enhanceable — can evolve to richer interactions later

## Components

| Component | Responsibility |
|-----------|---------------|
| AiEditor `ai.models.custom` config | Frontend AI entry point: construct payload, parse SSE response |
| `/api/editor/rewrite` API Route | Protocol translator: receive AiEditor request → call LangGraph SDK → convert agent streaming to standard SSE |
| LangGraph `lead_agent` | Main system agent, executes rewrite task |

## Design Decisions

- **Thread strategy**: Create a new thread per rewrite request (lightweight, stateless, isolated). No thread reuse — each rewrite is a one-shot operation.
- **Prompt construction**: AiEditor's menu items use `{content}` placeholder which gets replaced with selected text automatically. The full prompt (with instructions) is sent to the API Route.
- **SSE protocol**: API Route outputs standard SSE format (`data: {...}\n\n`), `parseMessage` extracts text chunks.
- **Why API Route, not direct LangGraph connection**:
  1. Protocol translation — LangGraph streaming format differs from AiEditor's simple SSE expectations
  2. Security — LangGraph Server (port 2024) is internal, should not be directly exposed to browser
  3. Thread lifecycle — managed server-side, frontend doesn't need to care

## File Changes

| File | Operation | Description |
|------|-----------|-------------|
| `frontend/src/components/editor/ai-editor-wrapper.tsx` | Modify | Add `ai` config (custom model + bubblePanelMenus) |
| `frontend/src/app/api/editor/rewrite/route.ts` | Create | LangGraph protocol translation layer |

## Frontend: AiEditor Configuration

In `ai-editor-wrapper.tsx`, add `ai` field to `new AiEditor({...})`:

```typescript
ai: {
  models: {
    custom: {
      url: "/api/editor/rewrite",
      protocol: "sse",
      method: "POST",
      headers: () => ({ "Content-Type": "application/json" }),
      wrapPayload: (prompt: string) => JSON.stringify({ prompt }),
      parseMessage: (bodyString: string) => {
        try {
          const json = JSON.parse(bodyString);
          if (json.type === "done") {
            return { role: "assistant", content: "", status: 2 };
          }
          return { role: "assistant", content: json.content ?? "", status: 1 };
        } catch {
          return undefined;
        }
      },
    },
  },
  bubblePanelEnable: true,
  bubblePanelModel: "custom",
  bubblePanelMenus: [
    // Copied from AiEditor's built-in PL array, customized as needed
    // Each item: { prompt, icon, title }
    // Separator: "<hr/>"
  ],
}
```

### AiMessage.status Protocol

- `0` — start (optional)
- `1` — streaming in progress (content is appended)
- `2` — done (triggers replace/insert buttons in result panel)

### bubblePanelMenus

AiEditor's built-in menus are hardcoded (the `PL` array in bundled source). To customize:
- **Don't set `bubblePanelMenus`** → uses all 6 built-in items unchanged
- **Set `bubblePanelMenus`** → fully replaces the list with your definition

Built-in items (each with i18n-based `title` key):
1. `improve-writing` — "改进写作"
2. `check-spelling-and-grammar` — "检查拼写和语法"
3. `make-shorter` — "简化内容"
4. `make-longer` — "丰富内容"
5. `translate` — "翻译"
6. `summarize` — "总结"

No merge mechanism exists — it's all-or-nothing replacement.

## Backend: API Route `/api/editor/rewrite`

New file: `frontend/src/app/api/editor/rewrite/route.ts`

### Request/Response Protocol

**Request** (from AiEditor CustomAiModelConfig):
```json
POST /api/editor/rewrite
Content-Type: application/json

{ "prompt": "<content>selected text</content>\nPlease improve this content..." }
```

**Response** (SSE stream):
```
data: {"content": "improved", "type": "chunk"}

data: {"content": " text content", "type": "chunk"}

data: {"type": "done"}
```

### Internal Flow

```typescript
export async function POST(req: Request) {
  const { prompt } = await req.json();

  // 1. Create LangGraph client (server-side, direct to port 2024)
  const client = new Client({ apiUrl: LANGGRAPH_BASE_URL });

  // 2. Create one-shot thread
  const thread = await client.threads.create();

  // 3. Start streaming run
  const stream = client.runs.stream(thread.thread_id, "lead_agent", {
    input: {
      messages: [{ role: "human", content: prompt }],
    },
    streamMode: ["messages"],
  });

  // 4. Translate to SSE for AiEditor
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        // Extract AI text chunks from messages stream mode
        if (event.event === "messages" && isAIMessageChunk(event.data)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk, type: "chunk" })}\n\n`)
          );
        }
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### LangGraph Stream Event Parsing

With `streamMode: ["messages"]`, we extract `AIMessage` text content:
- `event.event === "messages"` → `event.data` is `[message, metadata]` tuple
- `message.type === "ai"` && `message.content` is string → extract incremental text as chunk
- Other events (tool_call, thinking, etc.) are silently ignored

## Error Handling

| Scenario | Handling |
|----------|----------|
| API Route returns non-200 | AiEditor's `parseMessage` returns `undefined`, built-in panel shows no-response state |
| LangGraph Server unreachable | API Route catches error, sends `data: {"type":"error","content":"Service unavailable"}\n\n`, `parseMessage` converts to `status: 2` to terminate |
| Stream interruption (network) | AiEditor's built-in SSE handling triggers `onStop`, panel stops automatically |
| Agent long timeout | API Route sets stream timeout (60s), sends done signal on timeout |
