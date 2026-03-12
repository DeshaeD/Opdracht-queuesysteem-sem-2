"use client";

import { useCallback, useEffect, useState } from "react";

interface QueueTicket {
  id: string;
  sequenceNumber: number;
  status: "waiting" | "called" | "served" | "skipped";
}

export default function StudentPage() {
  const [queueId, setQueueId] = useState("ict-helpdesk");
  const [studentId, setStudentId] = useState("student-001");
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [eventMessage, setEventMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function joinQueue() {
    const response = await fetch(`/api/queues/${queueId}/join`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ studentId }),
    });
    const payload = await response.json();
    setStatusMessage(response.ok ? "Joined queue." : payload.error);
    if (response.ok) {
      setTicket(payload.ticket);
    }
  }

  const refreshMyTicket = useCallback(async () => {
    const response = await fetch(
      `/api/queues/${queueId}/me?studentId=${encodeURIComponent(studentId)}`,
    );
    const payload = await response.json();
    if (!response.ok) {
      setStatusMessage(payload.error);
      return;
    }
    setTicket(payload.ticket);
  }, [queueId, studentId]);

  useEffect(() => {
    if (!queueId) {
      return;
    }

    const eventSource = new EventSource(`/api/queues/${queueId}/stream`);

    eventSource.addEventListener("TicketCalled", (event) => {
      const parsed = JSON.parse((event as MessageEvent).data) as {
        payload: { sequenceNumber: number };
      };
      setEventMessage(`Now serving number ${parsed.payload.sequenceNumber}.`);
      void refreshMyTicket();
    });

    eventSource.addEventListener("QueueClosed", () => {
      setEventMessage("Queue has been closed.");
      void refreshMyTicket();
    });

    eventSource.addEventListener("QueuePaused", () => {
      setEventMessage("Teacher is currently on break.");
    });

    eventSource.addEventListener("QueueResumed", () => {
      setEventMessage("Teacher resumed queue handling.");
    });

    return () => {
      eventSource.close();
    };
  }, [queueId, refreshMyTicket]);

  return (
    <main className="container">
      <h1>Student queue view</h1>
      <div className="card">
        <label>
          Queue id
          <input value={queueId} onChange={(event) => setQueueId(event.target.value)} />
        </label>
        <label>
          Student id
          <input value={studentId} onChange={(event) => setStudentId(event.target.value)} />
        </label>
      </div>
      <div className="row">
        <button className="button" onClick={joinQueue}>
          Join queue
        </button>
        <button className="button secondary" onClick={refreshMyTicket}>
          Refresh my ticket
        </button>
      </div>

      {ticket && (
        <div className="card">
          <h2>My ticket</h2>
          <p>Number: {ticket.sequenceNumber}</p>
          <p>Status: {ticket.status}</p>
        </div>
      )}

      {eventMessage && <p className="hint">{eventMessage}</p>}
      {statusMessage && <p className="hint">{statusMessage}</p>}
    </main>
  );
}
