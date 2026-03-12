import { NextRequest, NextResponse } from "next/server";
import { queueIdSchema, studentIdSchema } from "@/lib/queue/schemas";
import { queueStore } from "@/lib/queue/store";

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
  const studentIdResult = studentIdParam ? studentIdSchema.safeParse(studentIdParam) : null;

  if (studentIdResult && !studentIdResult.success) {
    return NextResponse.json({ error: "Invalid student id." }, { status: 400 });
  }

  try {
    const snapshot = queueStore.getQueue(queueIdResult.data);
    const currentTicket = snapshot.tickets.find((ticket) => ticket.status === "called") ?? null;
    const waitingCount = snapshot.tickets.filter((ticket) => ticket.status === "waiting").length;
    const myTicket = studentIdResult?.success
      ? queueStore.getTicketForStudent(queueIdResult.data, studentIdResult.data)
      : null;

    return NextResponse.json({
      queue: snapshot.queue,
      currentTicket,
      waitingCount,
      myTicket,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read queue." },
      { status: 404 },
    );
  }
}
