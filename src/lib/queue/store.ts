import { queueEventBus } from "./events";
import type { Queue, QueueEvent, QueueEventType, TeacherMode, Ticket, TicketStatus } from "./types";

interface QueueSnapshot {
  queue: Queue;
  tickets: Ticket[];
}

class InMemoryQueueStore {
  private readonly queues = new Map<string, QueueSnapshot>();

  openQueue(queueId: string, context: string, teacherId: string, teacherName: string): Queue {
    if (this.queues.has(queueId)) {
      throw new Error("Queue already exists.");
    }

    const now = new Date().toISOString();
    const queue: Queue = {
      id: queueId,
      context,
      teacherName,
      status: "open",
      teacherId,
      mode: "active",
      currentTicketId: null,
      nextSequenceNumber: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.queues.set(queueId, { queue, tickets: [] });
    this.publish("QueueOpened", queueId, { context, teacherId, teacherName });

    return queue;
  }

  listQueues(): Array<Queue & { waitingCount: number }> {
    return Array.from(this.queues.values())
      .filter(({ queue }) => queue.status !== "closed")
      .map(({ queue, tickets }) => ({
        ...queue,
        waitingCount: tickets.filter((ticket) => ticket.status === "waiting").length,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  closeQueue(queueId: string): Queue {
    const snapshot = this.getQueueSnapshot(queueId);
    snapshot.queue.status = "closed";
    snapshot.queue.updatedAt = new Date().toISOString();
    this.publish("QueueClosed", queueId, {});

    return snapshot.queue;
  }

  setTeacherMode(queueId: string, mode: TeacherMode): Queue {
    const snapshot = this.getQueueSnapshot(queueId);

    if (snapshot.queue.status === "closed") {
      throw new Error("Queue is closed.");
    }

    snapshot.queue.mode = mode;
    snapshot.queue.status = mode === "break" ? "paused" : "open";
    snapshot.queue.updatedAt = new Date().toISOString();

    this.publish(mode === "break" ? "QueuePaused" : "QueueResumed", queueId, { mode });

    return snapshot.queue;
  }

  joinQueue(queueId: string, studentId: string): Ticket {
    const snapshot = this.getQueueSnapshot(queueId);

    if (snapshot.queue.status !== "open") {
      throw new Error("Queue is not open.");
    }

    const existingTicket = snapshot.tickets.find(
      (ticket) => ticket.studentId === studentId && (ticket.status === "waiting" || ticket.status === "called"),
    );

    if (existingTicket) {
      return existingTicket;
    }

    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: `${queueId}-${snapshot.queue.nextSequenceNumber}`,
      queueId,
      sequenceNumber: snapshot.queue.nextSequenceNumber,
      studentId,
      status: "waiting",
      createdAt: now,
      updatedAt: now,
    };

    snapshot.queue.nextSequenceNumber += 1;
    snapshot.queue.updatedAt = now;
    snapshot.tickets.push(ticket);
    this.publish("TicketIssued", queueId, {
      ticketId: ticket.id,
      sequenceNumber: ticket.sequenceNumber,
    });

    return ticket;
  }

  getQueue(queueId: string): QueueSnapshot {
    const snapshot = this.getQueueSnapshot(queueId);

    return {
      queue: { ...snapshot.queue },
      tickets: snapshot.tickets.map((ticket) => ({ ...ticket })),
    };
  }

  getTicketForStudent(queueId: string, studentId: string): Ticket | null {
    const snapshot = this.getQueueSnapshot(queueId);

    return (
      snapshot.tickets.find(
        (ticket) => ticket.studentId === studentId && (ticket.status === "waiting" || ticket.status === "called"),
      ) ?? null
    );
  }

  callNext(queueId: string, finishedStatus: Extract<TicketStatus, "served" | "skipped">): {
    calledTicket: Ticket | null;
    queue: Queue;
  } {
    const snapshot = this.getQueueSnapshot(queueId);

    if (snapshot.queue.status === "closed") {
      throw new Error("Queue is closed.");
    }

    if (snapshot.queue.mode === "break") {
      throw new Error("Teacher is on break.");
    }

    const now = new Date().toISOString();
    const currentTicket = snapshot.queue.currentTicketId
      ? snapshot.tickets.find((ticket) => ticket.id === snapshot.queue.currentTicketId)
      : null;

    if (currentTicket && currentTicket.status === "called") {
      currentTicket.status = finishedStatus;
      currentTicket.updatedAt = now;
      this.publish("TicketFinished", queueId, {
        ticketId: currentTicket.id,
        sequenceNumber: currentTicket.sequenceNumber,
        finishedStatus,
      });
    }

    const nextTicket = snapshot.tickets.find((ticket) => ticket.status === "waiting") ?? null;

    if (nextTicket) {
      nextTicket.status = "called";
      nextTicket.updatedAt = now;
      snapshot.queue.currentTicketId = nextTicket.id;
      snapshot.queue.updatedAt = now;
      this.publish("TicketCalled", queueId, {
        ticketId: nextTicket.id,
        sequenceNumber: nextTicket.sequenceNumber,
      });
    } else {
      snapshot.queue.currentTicketId = null;
      snapshot.queue.updatedAt = now;
    }

    return {
      calledTicket: nextTicket,
      queue: snapshot.queue,
    };
  }

  private publish(type: QueueEventType, queueId: string, payload: Record<string, unknown>): void {
    const event: QueueEvent = {
      type,
      queueId,
      timestamp: new Date().toISOString(),
      payload,
    };
    queueEventBus.publish(event);
  }

  private getQueueSnapshot(queueId: string): QueueSnapshot {
    const snapshot = this.queues.get(queueId);

    if (!snapshot) {
      throw new Error("Queue not found.");
    }

    return snapshot;
  }
}

declare global {
  var __inMemoryQueueStore: InMemoryQueueStore | undefined;
}

export const queueStore = globalThis.__inMemoryQueueStore ?? new InMemoryQueueStore();

if (!globalThis.__inMemoryQueueStore) {
  globalThis.__inMemoryQueueStore = queueStore;
}
