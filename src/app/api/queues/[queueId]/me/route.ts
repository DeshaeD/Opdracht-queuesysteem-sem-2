import { NextRequest, NextResponse } from "next/server";
import { queueIdSchema, studentIdSchema } from "@/lib/queue/schemas";
import { getRateLimitKey } from "@/lib/queue/security";
import { queueStore } from "@/lib/queue/store";
import { checkRateLimit } from "@/lib/queue/rate-limit";

interface RouteContext {
  params: Promise<{ queueId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const params = await context.params;
  const queueIdResult = queueIdSchema.safeParse(params.queueId);

  if (!queueIdResult.success) {
    return NextResponse.json({ error: "Invalid queue id." }, { status: 400 });
  }

  const studentIdParam = request.nextUrl.searchParams.get("studentId");
  const studentIdResult = studentIdSchema.safeParse(studentIdParam);

  if (!studentIdResult.success) {
    return NextResponse.json({ error: "Invalid student id." }, { status: 400 });
  }

  const allowed = checkRateLimit(getRateLimitKey(request, `me:${queueIdResult.data}`));

  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const ticket = queueStore.getTicketForStudent(queueIdResult.data, studentIdResult.data);

    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read ticket state." },
      { status: 404 },
    );
  }
}
