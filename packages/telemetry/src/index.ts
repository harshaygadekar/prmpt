import { createCorrelationId, redactPayload } from "@prmpt/shared-utils";

// --- Core event types ---

export interface TelemetryEvent {
  name: string;
  ts: string;
  correlationId: string;
  properties?: Record<string, unknown>;
}

export function createTelemetryEvent(
  name: string,
  properties?: Record<string, unknown>,
  now = new Date()
): TelemetryEvent {
  const event: TelemetryEvent = {
    name,
    ts: now.toISOString(),
    correlationId: createCorrelationId(now.getTime())
  };
  if (properties !== undefined) {
    event.properties = properties;
  }
  return event;
}

// --- Consent management (ST-08-03) ---

export type ConsentLevel = "none" | "errors-only" | "full";

export interface ConsentState {
  level: ConsentLevel;
  updatedAt: number;
}

/**
 * Default consent: telemetry disabled until user explicitly opts in.
 */
export function createDefaultConsent(): ConsentState {
  return { level: "none", updatedAt: Date.now() };
}

export function isConsentSufficient(consent: ConsentState, required: ConsentLevel): boolean {
  const order: ConsentLevel[] = ["none", "errors-only", "full"];
  return order.indexOf(consent.level) >= order.indexOf(required);
}

// --- Event queue (ST-08-03) ---

export interface TelemetrySink {
  /** Deliver a batch of events. Return true on success. */
  send(events: TelemetryEvent[]): Promise<boolean>;
}

export interface TelemetryQueueOptions {
  /** Max events to buffer before flush (default: 25) */
  batchSize?: number;
  /** Auto-flush interval in ms (default: 30_000). 0 = no auto-flush. */
  flushIntervalMs?: number;
  /** Consent state — events are dropped if consent is insufficient */
  consent: ConsentState;
  /** Minimum consent needed to enqueue (default: "errors-only") */
  requiredConsent?: ConsentLevel;
}

export class TelemetryQueue {
  private buffer: TelemetryEvent[] = [];
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private consent: ConsentState;
  private readonly requiredConsent: ConsentLevel;
  private sink: TelemetrySink | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private _flushed: TelemetryEvent[][] = [];
  private _dropped = 0;

  constructor(options: TelemetryQueueOptions) {
    this.batchSize = options.batchSize ?? 25;
    this.flushIntervalMs = options.flushIntervalMs ?? 30_000;
    this.consent = { ...options.consent };
    this.requiredConsent = options.requiredConsent ?? "errors-only";
  }

  /** Attach a remote sink. Without a sink, flush is a no-op. */
  attach(sink: TelemetrySink): void {
    this.sink = sink;
  }

  /** Start auto-flush timer. No-op if flushIntervalMs is 0. */
  start(): void {
    if (this.flushIntervalMs > 0 && !this.timer) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.flushIntervalMs);
    }
  }

  /** Stop auto-flush timer. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Update consent level at runtime (e.g., user changes settings). */
  updateConsent(level: ConsentLevel): void {
    this.consent = { level, updatedAt: Date.now() };
  }

  getConsent(): ConsentState {
    return { ...this.consent };
  }

  /**
   * Enqueue an event. Automatically redacts properties.
   * Returns false if dropped due to insufficient consent.
   */
  enqueue(event: TelemetryEvent): boolean {
    if (!isConsentSufficient(this.consent, this.requiredConsent)) {
      this._dropped++;
      return false;
    }

    // Deep-redact event properties before buffering
    const safe: TelemetryEvent = {
      name: event.name,
      ts: event.ts,
      correlationId: event.correlationId
    };
    if (event.properties) {
      safe.properties = redactPayload(event.properties) as Record<string, unknown>;
    }

    this.buffer.push(safe);

    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }

    return true;
  }

  /** Flush buffer to sink. Returns number of events flushed. */
  async flush(): Promise<number> {
    if (this.buffer.length === 0) return 0;

    const batch = this.buffer.splice(0, this.batchSize);
    this._flushed.push(batch);

    if (this.sink) {
      try {
        await this.sink.send(batch);
      } catch {
        // On failure, re-queue at the front (best-effort)
        this.buffer.unshift(...batch);
        return 0;
      }
    }

    return batch.length;
  }

  /** Number of events currently buffered. */
  get pending(): number {
    return this.buffer.length;
  }

  /** Number of events dropped due to insufficient consent. */
  get dropped(): number {
    return this._dropped;
  }

  /** All flushed batches (for testing). */
  get flushedBatches(): ReadonlyArray<ReadonlyArray<TelemetryEvent>> {
    return this._flushed;
  }

  /** Dispose: stop timer and clear buffer. */
  dispose(): void {
    this.stop();
    this.buffer.length = 0;
  }
}

// --- Convenience: safe event builder ---

/**
 * Build a telemetry event with automatic redaction applied upfront.
 * Use this when you want an already-safe event without going through the queue.
 */
export function createSafeTelemetryEvent(
  name: string,
  properties?: Record<string, unknown>,
  now = new Date()
): TelemetryEvent {
  const event = createTelemetryEvent(name, properties, now);
  if (event.properties) {
    event.properties = redactPayload(event.properties) as Record<string, unknown>;
  }
  return event;
}
