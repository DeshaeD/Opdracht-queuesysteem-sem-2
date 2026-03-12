import { NextRequest, NextResponse } from "next/server";
import { openQueueSchema } from "@/lib/queue/schemas";
import { assertTeacherAccess } from "@/lib/queue/security";
import { queueStore } from "@/lib/queue/store";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = assertTeacherAccess(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const payload = await request.json().catch(() => null);
  const parsedBody = openQueueSchema.safeParse(payload);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const queue = queueStore.openQueue(parsedBody.data.queueId, parsedBody.data.context, auth.teacherId);

    return NextResponse.json({ queue }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to open queue." },
      { status: 409 },
    );
  }
}
