import { EventEmitter } from "node:events";
import type { QueueEvent } from "./types";

const QUEUE_EVENT_NAME = "queue-event";

class QueueEventBus {
  private readonly emitter = new EventEmitter();

  publish(event: QueueEvent): void {
    this.emitter.emit(QUEUE_EVENT_NAME, event);
  }

  subscribe(listener: (event: QueueEvent) => void): () => void {
    this.emitter.on(QUEUE_EVENT_NAME, listener);

    return () => {
      this.emitter.off(QUEUE_EVENT_NAME, listener);
    };
  }
}

declare global {
  var __queueEventBus: QueueEventBus | undefined;
}

export const queueEventBus = globalThis.__queueEventBus ?? new QueueEventBus();

if (!globalThis.__queueEventBus) {
  globalThis.__queueEventBus = queueEventBus;
}
