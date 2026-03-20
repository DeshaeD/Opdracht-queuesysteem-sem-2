"use client";

import { useEffect, useState } from "react";

interface QueueResponse {
  queue: {
    id: string;
    context: string;
    teacherName: string;
    status: string;
    mode: string;
  };
}

export default function TeacherPage() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });
  const [teacherToken, setTeacherToken] = useState("dev-teacher-token");
  const [teacherName, setTeacherName] = useState("Teacher");
  const [queueId, setQueueId] = useState("ict-helpdesk");
  const [context, setContext] = useState("Databases support queue");
  const [finishedStatus, setFinishedStatus] = useState<"served" | "skipped">("served");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [queueState, setQueueState] = useState<QueueResponse["queue"] | null>(null);
  const authHeaders = new Headers();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  if (teacherToken.trim()) {
    authHeaders.set("authorization", `Bearer ${teacherToken.trim()}`);
  }

  async function openQueue() {
    const headers = new Headers(authHeaders);
    headers.set("content-type", "application/json");
    const response = await fetch("/api/queues", {
      method: "POST",
      headers,
      body: JSON.stringify({ queueId, context, teacherName }),
    });
    const payload = await response.json();
    setStatusMessage(response.ok ? "Queue opened." : payload.error);
    if (response.ok) {
      setQueueState(payload.queue);
    }
  }

  async function callNext() {
    const headers = new Headers(authHeaders);
    headers.set("content-type", "application/json");
    const response = await fetch(`/api/queues/${queueId}/call-next`, {
      method: "POST",
      headers,
      body: JSON.stringify({ finishedStatus }),
    });
    const payload = await response.json();
    setStatusMessage(
      response.ok
        ? payload.calledTicket
          ? `Now calling ${payload.calledTicket.sequenceNumber}.`
          : "No students waiting."
        : payload.error,
    );
  }

  async function toggleBreak(mode: "active" | "break") {
    const headers = new Headers(authHeaders);
    headers.set("content-type", "application/json");
    const response = await fetch(`/api/queues/${queueId}/break`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode }),
    });
    const payload = await response.json();
    setStatusMessage(response.ok ? `Teacher mode set to ${mode}.` : payload.error);
    if (response.ok) {
      setQueueState(payload.queue);
    }
  }

  async function closeQueue() {
    const response = await fetch(`/api/queues/${queueId}/close`, {
      method: "POST",
      headers: authHeaders,
    });
    const payload = await response.json();
    setStatusMessage(response.ok ? "Queue closed." : payload.error);
    if (response.ok) {
      setQueueState(payload.queue);
    }
  }

  return (
    <main className="container teacher-page">
      <header className="page-header">
        <h1>Teacher Dashboard</h1>
        <button className="button secondary" type="button" onClick={toggleTheme}>
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
      </header>

      <section className="teacher-controls-bar card" aria-label="Queue controls">
        <button className="button" onClick={() => toggleBreak("break")}>
          Pause queue
        </button>
        <button className="button" onClick={() => toggleBreak("active")}>
          Resume queue
        </button>
        <label className="inline-field">
          Complete previous as
          <select
            value={finishedStatus}
            onChange={(event) => setFinishedStatus(event.target.value as "served" | "skipped")}
          >
            <option value="served">served</option>
            <option value="skipped">skipped</option>
          </select>
        </label>
        <button className="button" onClick={callNext}>
          Call next student
        </button>
        <button className="button danger" onClick={closeQueue}>
          Close queue
        </button>
      </section>

      <section className="teacher-layout">
        <div className="card">
          <h2>Queue Setup</h2>
          <label>
            Teacher token
            <input value={teacherToken} onChange={(event) => setTeacherToken(event.target.value)} />
          </label>
          <label>
            Teacher name
            <input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} />
          </label>
          <label>
            Queue id
            <input value={queueId} onChange={(event) => setQueueId(event.target.value)} />
          </label>
          <label>
            Queue context
            <input value={context} onChange={(event) => setContext(event.target.value)} />
          </label>
          <button className="button" onClick={openQueue}>
            Open queue
          </button>
        </div>

        <div className="card">
          <h2>Live Queue Overview</h2>
          {!queueState && <p className="hint">Open a queue to view live status information.</p>}
          {queueState && (
            <div className="details-list">
              <p>
                <strong>ID:</strong> {queueState.id}
              </p>
              <p>
                <strong>Teacher:</strong> {queueState.teacherName}
              </p>
              <p>
                <strong>Context:</strong> {queueState.context}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`status-badge status-${queueState.status}`}>{queueState.status}</span>
              </p>
              <p>
                <strong>Teacher mode:</strong>{" "}
                <span className={`status-badge ${queueState.mode === "break" ? "status-paused" : "status-open"}`}>
                  {queueState.mode}
                </span>
              </p>
            </div>
          )}
        </div>
      </section>

      {statusMessage && <p className="hint status-banner">{statusMessage}</p>}
    </main>
  );
}
