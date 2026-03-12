import { NextRequest, NextResponse } from "next/server";
import { breakSchema, queueIdSchema } from "@/lib/queue/schemas";
import { assertTeacherAccess } from "@/lib/queue/security";
import { queueStore } from "@/lib/queue/store";

interface RouteContext {
  params: Promise<{ queueId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = assertTeacherAccess(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const params = await context.params;
  const queueIdResult = queueIdSchema.safeParse(params.queueId);

  if (!queueIdResult.success) {
    return NextResponse.json({ error: "Invalid queue id." }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsedBody = breakSchema.safeParse(payload);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const queue = queueStore.setTeacherMode(queueIdResult.data, parsedBody.data.mode);

    return NextResponse.json({ queue });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update break mode." },
      { status: 409 },
    );
  }
}
