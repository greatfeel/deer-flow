# AiEditor Agent Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable AiEditor's text selection AI menu ("改进写作" etc.) to call the main LangGraph `lead_agent` for text rewriting via a Next.js API Route protocol translator.

**Architecture:** AiEditor's `CustomAiModelConfig` sends selected text + prompt to `/api/editor/rewrite`. This Next.js API Route creates a one-shot LangGraph thread, submits the prompt to `lead_agent`, and translates the LangGraph streaming response into standard SSE that AiEditor's built-in result panel can parse and display.

**Tech Stack:** AiEditor v1.4.2 (`CustomAiModelConfig`), Next.js API Routes (App Router), `@langchain/langgraph-sdk` (server-side `Client`), SSE streaming via `ReadableStream`.

**Spec:** `docs/superpowers/specs/2026-03-28-aieditor-agent-rewrite-design.md`

---

## File Structure

| File | Operation | Responsibility |
|------|-----------|---------------|
| `frontend/src/components/editor/ai-editor-menus.ts` | Create | Bubble panel menu items + prompts (single source of truth for customization) |
| `frontend/src/components/editor/ai-editor-wrapper.tsx` | Modify | Add `ai` config to AiEditor — custom model + import menus |
| `frontend/src/app/api/editor/rewrite/route.ts` | Create | Protocol translator: AiEditor SSE ↔ LangGraph streaming |

---

### Task 1: Create menu config file (`ai-editor-menus.ts`)

**Files:**
- Create: `frontend/src/components/editor/ai-editor-menus.ts`

- [ ] **Step 1: Create `ai-editor-menus.ts` with all 6 built-in menu items**

All icons and prompts are copied from AiEditor's internal `PL` array. Each item has `title` (i18n key), `icon` (SVG string), and `prompt` (with `{content}` placeholder for selected text). Edit this file to add/remove/modify menu items or change prompts.

```typescript
// frontend/src/components/editor/ai-editor-menus.ts

/**
 * AiEditor bubble panel menu configuration.
 *
 * - To add a menu item: append an object with { title, icon, prompt } to the array.
 * - To modify a prompt: edit the `prompt` field of the corresponding item.
 * - To add a separator: insert "<hr/>" between items.
 * - `{content}` in prompts is replaced by AiEditor with the selected text.
 * - `title` can be an AiEditor i18n key (e.g. "improve-writing" → "改进写作")
 *   or a plain string for custom items (displayed as-is).
 */

import type { AIBubbleMenuItem } from "aieditor";

export const bubblePanelMenus: AIBubbleMenuItem[] = [
  {
    title: "improve-writing",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.1986 9.94447C14.7649 9.5337 14.4859 8.98613 14.4085 8.39384L14.0056 5.31138L11.275 6.79724C10.7503 7.08274 10.1433 7.17888 9.55608 7.06948L6.49998 6.50015L7.06931 9.55625C7.17871 10.1435 7.08257 10.7505 6.79707 11.2751L5.31121 14.0057L8.39367 14.4086C8.98596 14.4861 9.53353 14.7651 9.94431 15.1987L12.0821 17.4557L13.4178 14.6486C13.6745 14.1092 14.109 13.6747 14.6484 13.418L17.4555 12.0823L15.1986 9.94447ZM15.2238 15.5079L13.0111 20.1581C12.8687 20.4573 12.5107 20.5844 12.2115 20.442C12.1448 20.4103 12.0845 20.3665 12.0337 20.3129L8.49229 16.5741C8.39749 16.474 8.27113 16.4096 8.13445 16.3918L3.02816 15.7243C2.69958 15.6814 2.46804 15.3802 2.51099 15.0516C2.52056 14.9784 2.54359 14.9075 2.5789 14.8426L5.04031 10.3192C5.1062 10.1981 5.12839 10.058 5.10314 9.92253L4.16 4.85991C4.09931 4.53414 4.3142 4.22086 4.63997 4.16017C4.7126 4.14664 4.78711 4.14664 4.85974 4.16017L9.92237 5.10331C10.0579 5.12855 10.198 5.10637 10.319 5.04048L14.8424 2.57907C15.1335 2.42068 15.4979 2.52825 15.6562 2.81931C15.6916 2.88421 15.7146 2.95507 15.7241 3.02833L16.3916 8.13462C16.4095 8.2713 16.4739 8.39766 16.5739 8.49245L20.3127 12.0338C20.5533 12.2617 20.5636 12.6415 20.3357 12.8821C20.2849 12.9357 20.2246 12.9795 20.1579 13.0112L15.5078 15.224C15.3833 15.2832 15.283 15.3835 15.2238 15.5079ZM16.0206 17.435L17.4348 16.0208L21.6775 20.2634L20.2633 21.6776L16.0206 17.435Z"></path></svg>',
    prompt: `<content>{content}</content>
请帮我优化一下这段内容，并直接返回优化后的结果。
注意：你应该先判断一下这句话是中文还是英文，如果是中文，请给我返回中文的内容，如果是英文，请给我返回英文内容，只需要返回内容即可，不需要告知我是中文还是英文。`,
  },
  {
    title: "check-spelling-and-grammar",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 19C12.8284 19 13.5 19.6716 13.5 20.5C13.5 21.3284 12.8284 22 12 22C11.1716 22 10.5 21.3284 10.5 20.5C10.5 19.6716 11.1716 19 12 19ZM6.5 19C7.32843 19 8 19.6716 8 20.5C8 21.3284 7.32843 22 6.5 22C5.67157 22 5 21.3284 5 20.5C5 19.6716 5.67157 19 6.5 19ZM17.5 19C18.3284 19 19 19.6716 19 20.5C19 21.3284 18.3284 22 17.5 22C16.6716 22 16 21.3284 16 20.5C16 19.6716 16.6716 19 17.5 19ZM13 2V4H19V6L17.0322 6.0006C16.2423 8.3666 14.9984 10.5065 13.4107 12.302C14.9544 13.6737 16.7616 14.7204 18.7379 15.3443L18.2017 17.2736C15.8917 16.5557 13.787 15.3326 12.0005 13.7257C10.214 15.332 8.10914 16.5553 5.79891 17.2734L5.26257 15.3442C7.2385 14.7203 9.04543 13.6737 10.5904 12.3021C9.46307 11.0285 8.50916 9.58052 7.76789 8.00128L10.0074 8.00137C10.5706 9.03952 11.2401 10.0037 11.9998 10.8772C13.2283 9.46508 14.2205 7.81616 14.9095 6.00101L5 6V4H11V2H13Z"></path></svg>',
    prompt: `<content>{content}</content>
请帮我检查一下这段内容，是否有拼写错误或者语法上的错误。
注意：你应该先判断一下这句话是中文还是英文，如果是中文，请给我返回中文的内容，如果是英文，请给我返回英文内容，只需要返回内容即可，不需要告知我是中文还是英文。`,
  },
  {
    title: "make-shorter",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.75736L19 8.75736V4H10V9H5V20H19V17.2426L21 15.2426V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V6.75736ZM21.7782 8.80761L23.1924 10.2218L15.4142 18L13.9979 17.9979L14 16.5858L21.7782 8.80761Z"></path></svg>',
    prompt: `<content>{content}</content>
这句话的内容较长，帮我简化一下这个内容，并直接返回简化后的内容结果。
注意：你应该先判断一下这句话是中文还是英文，如果是中文，请给我返回中文的内容，如果是英文，请给我返回英文内容，只需要返回内容即可，不需要告知我是中文还是英文。`,
  },
  {
    title: "make-longer",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2C20.5523 2 21 2.44772 21 3V6.757L19 8.757V4H5V20H19V17.242L21 15.242V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20ZM21.7782 8.80761L23.1924 10.2218L15.4142 18L13.9979 17.9979L14 16.5858L21.7782 8.80761ZM13 12V14H8V12H13ZM16 8V10H8V8H16Z"></path></svg>',
    prompt: `<content>{content}</content>
这句话的内容较简短，帮我简单的优化和丰富一下内容，并直接返回优化后的结果。注意：优化的内容不能超过原来内容的 2 倍。
注意：你应该先判断一下这句话是中文还是英文，如果是中文，请给我返回中文的内容，如果是英文，请给我返回英文内容，只需要返回内容即可，不需要告知我是中文还是英文。`,
  },
  "<hr/>",
  {
    title: "translate",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 15V17C5 18.0544 5.81588 18.9182 6.85074 18.9945L7 19H10V21H7C4.79086 21 3 19.2091 3 17V15H5ZM18 10L22.4 21H20.245L19.044 18H14.954L13.755 21H11.601L16 10H18ZM17 12.8852L15.753 16H18.245L17 12.8852ZM8 2V4H12V11H8V14H6V11H2V4H6V2H8ZM17 3C19.2091 3 21 4.79086 21 7V9H19V7C19 5.89543 18.1046 5 17 5H14V3H17ZM6 6H4V9H6V6ZM10 6H8V9H10V6Z"></path></svg>',
    prompt: `<content>{content}</content>
请帮我翻译以上内容，在翻译之前，想先判断一下这个内容是不是中文，如果是中文，则翻译为英文，如果是其他语言，则需要翻译为中文，注意，你只需要返回翻译的结果，不需要对此进行任何解释，不需要除了翻译结果以外的其他任何内容。`,
  },
  {
    title: "summarize",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3C19.6569 3 21 4.34315 21 6C21 7.65685 19.6569 9 18 9H15C13.6941 9 12.5831 8.16562 12.171 7.0009L11 7C9.9 7 9 7.9 9 9L9.0009 9.17102C10.1656 9.58312 11 10.6941 11 12C11 13.3059 10.1656 14.4169 9.0009 14.829L9 15C9 16.1 9.9 17 11 17L12.1707 17.0001C12.5825 15.8349 13.6937 15 15 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21H15C13.6941 21 12.5831 20.1656 12.171 19.0009L11 19C8.79 19 7 17.21 7 15H5C3.34315 15 2 13.6569 2 12C2 10.3431 3.34315 9 5 9H7C7 6.79086 8.79086 5 11 5L12.1707 5.00009C12.5825 3.83485 13.6937 3 15 3H18ZM18 17H15C14.4477 17 14 17.4477 14 18C14 18.5523 14.4477 19 15 19H18C18.5523 19 19 18.5523 19 18C19 17.4477 18.5523 17 18 17ZM8 11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H8C8.55228 13 9 12.5523 9 12C9 11.4477 8.55228 11 8 11ZM18 5H15C14.4477 5 14 5.44772 14 6C14 6.55228 14.4477 7 15 7H18C18.5523 7 19 6.55228 19 6C19 5.44772 18.5523 5 18 5Z"></path></svg>',
    prompt: `<content>{content}</content>
请帮我总结以上内容，并直接返回总结的结果
注意：你应该先判断一下这句话是中文还是英文，如果是中文，请给我返回中文的内容，如果是英文，请给我返回英文内容，只需要返回内容即可，不需要告知我是中文还是英文。`,
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit src/components/editor/ai-editor-menus.ts 2>&1 | head -20`

If `AIBubbleMenuItem` is not exported from `aieditor`, change the import to use a local type definition:

```typescript
// Replace the import line with:
type AIBubbleMenuItem = {
  prompt: string;
  icon: string;
  title: string;
} | string;
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/editor/ai-editor-menus.ts
git commit -m "feat: add customizable AI bubble panel menu config for AiEditor"
```

---

### Task 2: Create API Route (`/api/editor/rewrite`)

**Files:**
- Create: `frontend/src/app/api/editor/rewrite/route.ts`
- Read: `frontend/src/core/config/index.ts` (for understanding URL resolution pattern)

- [ ] **Step 1: Create the API Route file**

This route receives a `{ prompt }` JSON body from AiEditor, creates a one-shot LangGraph thread, streams the agent response, and translates it to SSE format that AiEditor's `parseMessage` can consume.

```typescript
// frontend/src/app/api/editor/rewrite/route.ts

import { Client } from "@langchain/langgraph-sdk";

const LANGGRAPH_API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_BASE_URL || "http://localhost:2024";

export async function POST(req: Request) {
  let prompt: string;
  try {
    const body = (await req.json()) as { prompt?: string };
    prompt = body.prompt ?? "";
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!prompt.trim()) {
    return new Response("Missing prompt", { status: 400 });
  }

  const client = new Client({ apiUrl: LANGGRAPH_API_URL });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Create a one-shot thread for this rewrite request
        const thread = await client.threads.create();

        // Stream the agent response using messages mode
        const stream = client.runs.stream(thread.thread_id, "lead_agent", {
          input: {
            messages: [{ role: "human", content: prompt }],
          },
          streamMode: ["messages"],
        });

        for await (const event of stream) {
          if (event.event === "messages") {
            // event.data is [message, metadata] in messages stream mode
            const data = event.data as [Record<string, unknown>, unknown];
            const message = data[0];

            // Only forward AIMessage text content (skip tool calls, thinking, etc.)
            if (
              message &&
              message.type === "ai" &&
              typeof message.content === "string" &&
              message.content.length > 0
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: message.content, type: "chunk" })}\n\n`,
                ),
              );
            }
          }
        }

        // Signal completion
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Agent request failed";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", content: errorMessage })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
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

**Key implementation notes for the developer:**

- `LANGGRAPH_API_URL`: In the dev environment, the nginx proxy on port 2026 routes `/api/langgraph/*` to port 2024. However, this API Route runs server-side in Node.js, so we connect directly to the LangGraph server. The env var `NEXT_PUBLIC_LANGGRAPH_BASE_URL` may point to the proxied URL; fallback `http://localhost:2024` connects directly.
- `streamMode: ["messages"]`: This mode returns `[message, metadata]` tuples. We only care about `message.type === "ai"` with string `content`. Tool calls, thinking tokens, and other event types are silently skipped.
- `event.data` typing: The LangGraph SDK types the data loosely. We cast to `[Record<string, unknown>, unknown]` and check fields defensively.
- Error handling: On any error (LangGraph unreachable, agent crash), we send an `error` SSE event so AiEditor's `parseMessage` can display it, then close the stream.

- [ ] **Step 2: Verify the route compiles**

Run: `cd frontend && npx tsc --noEmit src/app/api/editor/rewrite/route.ts 2>&1 | head -20`

Expected: no type errors. If `Client` import from `@langchain/langgraph-sdk` has issues in a server context, check the SDK is in `dependencies` (not just `devDependencies`) in `package.json`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/editor/rewrite/route.ts
git commit -m "feat: add /api/editor/rewrite API Route for LangGraph agent rewriting"
```

---

### Task 3: Wire AiEditor to use custom AI model + menus

**Files:**
- Modify: `frontend/src/components/editor/ai-editor-wrapper.tsx`
- Read: `frontend/src/components/editor/ai-editor-menus.ts` (from Task 1)

- [ ] **Step 1: Add `ai` config to AiEditor initialization**

Open `frontend/src/components/editor/ai-editor-wrapper.tsx`. Add the import at the top of the file, after the existing imports:

```typescript
import { bubblePanelMenus } from "./ai-editor-menus";
```

Then add the `ai` property to the `new AiEditor({...})` options object, after the `onChange` callback (around line 63):

```typescript
      editor = new AiEditor({
        element: containerRef.current,
        placeholder: "开始你的创作...",
        content: draft,
        toolbarKeys: [
          "undo", "redo", "|",
          "heading", "|",
          "bold", "italic", "underline", "strike", "|",
          "fontColor", "highlight", "|",
          "link", "image", "table", "code-block", "|",
          "align", "bullet-list", "ordered-list", "indent-decrease", "indent-increase", "|",
          "quote", "hr", "|",
          "fullscreen",
        ],
        image: {
          base64LimitSize: 2 * 1024 * 1024,
        },
        codeBlock: {
          languages: [
            { name: "javascript", label: "JavaScript" },
            { name: "typescript", label: "TypeScript" },
            { name: "python", label: "Python" },
            { name: "java", label: "Java" },
            { name: "go", label: "Go" },
            { name: "rust", label: "Rust" },
            { name: "html", label: "HTML" },
            { name: "css", label: "CSS" },
            { name: "sql", label: "SQL" },
            { name: "bash", label: "Bash" },
            { name: "json", label: "JSON" },
            { name: "markdown", label: "Markdown" },
          ],
        },
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
                  const json = JSON.parse(bodyString) as {
                    type?: string;
                    content?: string;
                  };
                  if (json.type === "done" || json.type === "error") {
                    return { role: "assistant", content: json.content ?? "", status: 2 };
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
          bubblePanelMenus,
        },
        onChange: (aiEditor) => {
          onChange?.(aiEditor.getHtml());
        },
      });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm typecheck 2>&1 | tail -20`

Expected: no errors. If AiEditor's types don't fully match, the `ai` config may need a type assertion:

```typescript
ai: {
  // ...config
} as any,
```

This is acceptable since AiEditor's TypeScript definitions may not cover all config options.

- [ ] **Step 3: Manual smoke test**

Run: `cd frontend && pnpm dev`

1. Open `http://localhost:3000/workspace/aieditor` in the browser
2. Type some text in the editor (e.g. "这是一段需要优化的测试文字")
3. Select the text
4. Verify: a bubble menu appears with AI options ("改进写作", "检查拼写和语法", etc.)
5. Click "改进写作"
6. Verify: AiEditor shows the AI result panel with streaming text from the LangGraph agent
7. Verify: the result panel shows "替换" / "插入" buttons when streaming completes

If the LangGraph server is not running, the result panel should show an error message ("Agent request failed" or similar) instead of hanging indefinitely.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/editor/ai-editor-wrapper.tsx
git commit -m "feat: wire AiEditor AI bubble menu to LangGraph agent via custom model"
```

---

### Task 4: Lint and type check

**Files:**
- All modified/created files from Tasks 1-3

- [ ] **Step 1: Run full frontend lint**

Run: `cd frontend && pnpm lint 2>&1 | tail -30`

Fix any lint errors (likely: import ordering, unused variables). The ESLint config enforces import order: builtin → external → internal.

- [ ] **Step 2: Run full frontend type check**

Run: `cd frontend && pnpm typecheck 2>&1 | tail -30`

Expected: no errors.

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -u
git commit -m "fix: lint and type check fixes for AiEditor agent rewrite"
```

Skip this commit if there were no fixes needed.
