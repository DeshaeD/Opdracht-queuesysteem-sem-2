"use client";

import { useState } from "react";

interface QueueResponse {
  queue: {
    id: string;
    context: string;
    status: string;
    mode: string;
  };
}

export default function TeacherPage() {
  const [teacherToken, setTeacherToken] = useState("dev-teacher-token");
  const [queueId, setQueueId] = useState("ict-helpdesk");
  const [context, setContext] = useState("Databases support queue");
  const [finishedStatus, setFinishedStatus] = useState<"served" | "skipped">("served");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [queueState, setQueueState] = useState<QueueResponse["queue"] | null>(null);
  const authHeaders = new Headers();
  if (teacherToken.trim()) {
    authHeaders.set("authorization", `Bearer ${teacherToken.trim()}`);
  }

  async function openQueue() {
    const headers = new Headers(authHeaders);
    headers.set("content-type", "application/json");
    const response = await fetch("/api/queues", {
      method: "POST",
      headers,
      body: JSON.stringify({ queueId, context }),
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
    <main className="container">
      <h1>Teacher dashboard</h1>

      <div className="card">
        <label>
          Teacher token
          <input value={teacherToken} onChange={(event) => setTeacherToken(event.target.value)} />
        </label>
        <label>
          Queue id
          <input value={queueId} onChange={(event) => setQueueId(event.target.value)} />
        </label>
        <label>
          Queue context
          <input value={context} onChange={(event) => setContext(event.target.value)} />
        </label>
      </div>

      <div className="row">
        <button className="button" onClick={openQueue}>
          Open queue
        </button>
        <button className="button" onClick={() => toggleBreak("break")}>
          Start break
        </button>
        <button className="button" onClick={() => toggleBreak("active")}>
          End break
        </button>
        <button className="button danger" onClick={closeQueue}>
          Close queue
        </button>
      </div>

      <div className="card">
        <label>
          When calling next, mark previous ticket as
          <select
            value={finishedStatus}
            onChange={(event) => setFinishedStatus(event.target.value as "served" | "skipped")}
          >
            <option value="served">served</option>
            <option value="skipped">skipped</option>
          </select>
        </label>
        <button className="button" onClick={callNext}>
          Call next number
        </button>
      </div>

      {queueState && (
        <div className="card">
          <h2>Queue state</h2>
          <p>ID: {queueState.id}</p>
          <p>Context: {queueState.context}</p>
          <p>Status: {queueState.status}</p>
          <p>Teacher mode: {queueState.mode}</p>
        </div>
      )}

      {statusMessage && <p className="hint">{statusMessage}</p>}
    </main>
  );
}
