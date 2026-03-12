export type QueueStatus = "open" | "paused" | "closed";
export type TeacherMode = "active" | "break";
export type TicketStatus = "waiting" | "called" | "served" | "skipped";

export interface Queue {
  id: string;
  context: string;
  status: QueueStatus;
  teacherId: string;
  mode: TeacherMode;
  currentTicketId: string | null;
  nextSequenceNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  queueId: string;
  sequenceNumber: number;
  studentId: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export type QueueEventType =
  | "QueueOpened"
  | "QueuePaused"
  | "QueueResumed"
  | "QueueClosed"
  | "TicketIssued"
  | "TicketCalled"
  | "TicketFinished";

export interface QueueEvent {
  type: QueueEventType;
  queueId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
