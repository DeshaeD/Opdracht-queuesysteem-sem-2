import { NextRequest } from "next/server";
import { queueEventBus } from "@/lib/queue/events";
import { queueIdSchema } from "@/lib/queue/schemas";

interface RouteContext {
  params: Promise<{ queueId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  const queueIdResult = queueIdSchema.safeParse(params.queueId);

  if (!queueIdResult.success) {
    return new Response(JSON.stringify({ error: "Invalid queue id." }), { status: 400 });
  }

  const queueId = queueIdResult.data;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 10_000);

      const unsubscribe = queueEventBus.subscribe((event) => {
        if (event.queueId !== queueId) {
          return;
        }

        const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      });

      const abortHandler = () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      };

      request.signal.addEventListener("abort", abortHandler);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
