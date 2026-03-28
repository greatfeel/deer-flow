import { Client } from "@langchain/langgraph-sdk";
import type { Message } from "@langchain/langgraph-sdk";

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
        const thread = await client.threads.create();

        const stream = client.runs.stream(thread.thread_id, "lead_agent", {
          input: {
            messages: [{ role: "human", content: prompt }],
          },
          streamMode: "messages",
        });

        // messages/partial returns cumulative content, so we track the last
        // seen length and only send the delta to AiEditor (which appends).
        let lastContentLength = 0;

        for await (const event of stream) {
          if (event.event === "messages/partial") {
            const messages = event.data as Message[];
            const lastMessage = messages[messages.length - 1];

            if (
              lastMessage &&
              lastMessage.type === "ai" &&
              typeof lastMessage.content === "string" &&
              lastMessage.content.length > lastContentLength
            ) {
              const delta = lastMessage.content.slice(lastContentLength);
              lastContentLength = lastMessage.content.length;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: delta, type: "chunk" })}\n\n`,
                ),
              );
            }
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done" })}\n\n`,
          ),
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
