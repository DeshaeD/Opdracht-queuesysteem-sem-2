"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface QueueTicket {
  id: string;
  sequenceNumber: number;
  status: "waiting" | "called" | "served" | "skipped";
}

interface AvailableQueue {
  id: string;
  context: string;
  teacherName: string;
  status: "open" | "paused" | "closed";
  waitingCount: number;
}

interface ToastMessage {
  id: number;
  text: string;
  variant: "info" | "neutral";
}

export default function StudentPage() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });
  const [studentId, setStudentId] = useState("student-001");
  const [queues, setQueues] = useState<AvailableQueue[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState("");
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [currentServingNumber, setCurrentServingNumber] = useState<number | null>(null);
  const myTicketIdRef = useRef<string | null>(null);
  const toastIdRef = useRef(1);

  const selectedQueue = queues.find((queue) => queue.id === selectedQueueId) ?? null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  const pushToast = useCallback((text: string, variant: ToastMessage["variant"] = "info") => {
    const id = toastIdRef.current;
    toastIdRef.current += 1;

    setToasts((previous) => [...previous, { id, text, variant }]);

    setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const loadQueueSnapshot = useCallback(async () => {
    if (!selectedQueueId) {
      setCurrentServingNumber(null);
      return;
    }

    const response = await fetch(`/api/queues/${selectedQueueId}`);
    const payload = await response.json();

    if (!response.ok) {
      return;
    }

    setCurrentServingNumber(payload.currentTicket?.sequenceNumber ?? null);
  }, [selectedQueueId]);

  const loadQueues = useCallback(async () => {
    const response = await fetch("/api/queues");
    const payload = await response.json();

    if (!response.ok) {
      return;
    }

    const availableQueues = (payload.queues as AvailableQueue[]).filter((queue) => queue.status !== "closed");
    setQueues(availableQueues);

    if (!selectedQueueId && availableQueues.length > 0) {
      setSelectedQueueId(availableQueues[0].id);
    }

    if (selectedQueueId && !availableQueues.some((queue) => queue.id === selectedQueueId)) {
      setSelectedQueueId(availableQueues[0]?.id ?? "");
      setTicket(null);
      myTicketIdRef.current = null;
    }
  }, [selectedQueueId]);

  async function joinQueue() {
    if (!selectedQueueId) {
      pushToast("Select a queue first.", "neutral");
      return;
    }

    const response = await fetch(`/api/queues/${selectedQueueId}/join`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ studentId }),
    });
    const payload = await response.json();
    pushToast(response.ok ? "Joined queue." : payload.error, response.ok ? "info" : "neutral");
    if (response.ok) {
      setTicket(payload.ticket);
      myTicketIdRef.current = payload.ticket.id;
      void loadQueues();
    }
  }

  const refreshMyTicket = useCallback(async () => {
    if (!selectedQueueId) {
      setTicket(null);
      myTicketIdRef.current = null;
      return null;
    }

    const response = await fetch(
      `/api/queues/${selectedQueueId}/me?studentId=${encodeURIComponent(studentId)}`,
    );
    const payload = await response.json();
    if (!response.ok) {
      pushToast(payload.error, "neutral");
      return null;
    }

    const myTicket = payload.ticket as QueueTicket | null;
    setTicket(myTicket);
    myTicketIdRef.current = myTicket?.id ?? null;
    return myTicket;
  }, [selectedQueueId, studentId, pushToast]);

  useEffect(() => {
    const initialLoadTimeout = setTimeout(() => {
      void loadQueues();
    }, 0);

    const interval = setInterval(() => {
      void loadQueues();
    }, 10_000);

    return () => {
      clearTimeout(initialLoadTimeout);
      clearInterval(interval);
    };
  }, [loadQueues]);

  useEffect(() => {
    const refreshTimeout = setTimeout(() => {
      void refreshMyTicket();
      void loadQueueSnapshot();
    }, 0);

    return () => {
      clearTimeout(refreshTimeout);
    };
  }, [selectedQueueId, refreshMyTicket, loadQueueSnapshot]);

  useEffect(() => {
    if (!selectedQueueId) {
      return;
    }

    const eventSource = new EventSource(`/api/queues/${selectedQueueId}/stream`);

    eventSource.addEventListener("TicketCalled", (event) => {
      const parsed = JSON.parse((event as MessageEvent).data) as {
        payload: { sequenceNumber: number; ticketId: string };
      };

      if (myTicketIdRef.current && parsed.payload.ticketId === myTicketIdRef.current) {
        pushToast(`It is your turn now. Your number is ${parsed.payload.sequenceNumber}.`, "info");
      } else {
        pushToast(`Now serving number ${parsed.payload.sequenceNumber}.`, "neutral");
      }

      setCurrentServingNumber(parsed.payload.sequenceNumber);

      void refreshMyTicket();
      void loadQueues();
    });

    eventSource.addEventListener("QueueClosed", () => {
      pushToast("Queue has been closed.", "neutral");
      void refreshMyTicket();
      void loadQueues();
    });

    eventSource.addEventListener("QueuePaused", () => {
      pushToast("Teacher is currently on break.", "neutral");
      void loadQueues();
    });

    eventSource.addEventListener("QueueResumed", () => {
      pushToast("Teacher resumed queue handling.", "neutral");
      void loadQueues();
    });

    return () => {
      eventSource.close();
    };
  }, [selectedQueueId, refreshMyTicket, loadQueues, pushToast]);

  return (
    <main className="container student-page">
      <header className="page-header">
        <h1>Student Queue View</h1>
        <button className="button secondary" type="button" onClick={toggleTheme}>
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
      </header>

      <section className="student-layout">
        <div className="card">
          <aside className="serving-panel-inline" aria-live="polite">
            <p className="serving-label">Now serving</p>
            <p className="serving-number">{currentServingNumber ?? "-"}</p>
          </aside>
          <h2>Join Queue</h2>
          <label>
            Student id
            <input value={studentId} onChange={(event) => setStudentId(event.target.value)} />
          </label>
          <div>
            <p className="hint">Available queues</p>
            {queues.length === 0 && <p className="hint">No queues available.</p>}
            {queues.length > 0 && (
              <div className="queue-grid" role="list" aria-label="Available queues">
                {queues.map((queue) => {
                  const isSelected = queue.id === selectedQueueId;

                  return (
                    <button
                      key={queue.id}
                      type="button"
                      className={`queue-tile ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedQueueId(queue.id);
                      }}
                      aria-pressed={isSelected}
                    >
                      <strong>{queue.teacherName}</strong>
                      <span>{queue.context}</span>
                      <span>
                        Status: <span className={`status-badge status-${queue.status}`}>{queue.status}</span>
                      </span>
                      <span>Waiting: {queue.waitingCount}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="row">
            <button className="button" onClick={joinQueue}>
              Join queue
            </button>
            <button className="button secondary" onClick={loadQueues}>
              Refresh queue list
            </button>
            <button className="button secondary" onClick={refreshMyTicket}>
              Refresh my ticket
            </button>
          </div>
        </div>

        <div className="card queue-side-panel">
          <h2>Selected Queue</h2>
          {!selectedQueue && <p className="hint">Choose a queue from the left panel.</p>}
          {selectedQueue && (
            <div className="details-list">
              <p>
                <strong>Teacher:</strong> {selectedQueue.teacherName}
              </p>
              <p>
                <strong>Queue:</strong> {selectedQueue.context}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`status-badge status-${selectedQueue.status}`}>{selectedQueue.status}</span>
              </p>
              <p>
                <strong>Waiting students:</strong> {selectedQueue.waitingCount}
              </p>
            </div>
          )}

          {ticket && (
            <div className="ticket-box">
              <h3>My ticket</h3>
              <p>Number: {ticket.sequenceNumber}</p>
              <p>Status: {ticket.status}</p>
            </div>
          )}
        </div>
      </section>

      {toasts.length > 0 && (
        <div className="notification-stack" aria-live="polite" aria-atomic="false">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`notification-popover ${toast.variant === "neutral" ? "secondary-popover" : ""}`}
            >
              {toast.text}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
