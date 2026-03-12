import { NextRequest, NextResponse } from "next/server";
import { joinQueueSchema, queueIdSchema } from "@/lib/queue/schemas";
import { getRateLimitKey } from "@/lib/queue/security";
import { queueStore } from "@/lib/queue/store";
import { checkRateLimit } from "@/lib/queue/rate-limit";

interface RouteContext {
  params: Promise<{ queueId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const params = await context.params;
  const queueIdResult = queueIdSchema.safeParse(params.queueId);

  if (!queueIdResult.success) {
    return NextResponse.json({ error: "Invalid queue id." }, { status: 400 });
  }

  const rateLimitKey = getRateLimitKey(request, `join:${queueIdResult.data}`);
  const allowed = checkRateLimit(rateLimitKey);

  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsedBody = joinQueueSchema.safeParse(payload);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const ticket = queueStore.joinQueue(queueIdResult.data, parsedBody.data.studentId);

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not join queue." },
      { status: 409 },
    );
  }
}
