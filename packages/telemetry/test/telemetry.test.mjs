import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createTelemetryEvent,
  createSafeTelemetryEvent,
  createDefaultConsent,
  isConsentSufficient,
  TelemetryQueue
} from "../dist/index.js";

// --- createTelemetryEvent ---

describe("createTelemetryEvent", () => {
  test("creates event with name and timestamp", () => {
    const now = new Date("2025-01-15T12:00:00Z");
    const event = createTelemetryEvent("optimize.start", undefined, now);
    assert.equal(event.name, "optimize.start");
    assert.equal(event.ts, "2025-01-15T12:00:00.000Z");
    assert.ok(event.correlationId.startsWith("corr_"));
    assert.equal(event.properties, undefined);
  });

  test("creates event with properties", () => {
    const event = createTelemetryEvent("optimize.complete", {
      modelFamily: "gpt-4",
      durationMs: 1200
    });
    assert.equal(event.name, "optimize.complete");
    assert.equal(event.properties.modelFamily, "gpt-4");
    assert.equal(event.properties.durationMs, 1200);
  });
});

// --- createSafeTelemetryEvent ---

describe("createSafeTelemetryEvent", () => {
  test("redacts secret fields in properties", () => {
    const event = createSafeTelemetryEvent("api.call", {
      modelFamily: "gpt-4",
      api_key: "sk-abcdefghij1234567890abcdef",
      password: "hunter2"
    });
    assert.equal(event.properties.modelFamily, "gpt-4");
    assert.equal(event.properties.api_key, "[REDACTED_SECRET]");
    assert.equal(event.properties.password, "[REDACTED_SECRET]");
  });

  test("redacts restricted fields in properties", () => {
    const event = createSafeTelemetryEvent("optimize.complete", {
      prompt: "fix this code",
      outputFormat: "typescript"
    });
    assert.equal(event.properties.prompt, "[REDACTED]");
    assert.equal(event.properties.outputFormat, "typescript");
  });

  test("returns event without properties unchanged", () => {
    const event = createSafeTelemetryEvent("app.start");
    assert.equal(event.properties, undefined);
  });
});

// --- Consent ---

describe("Consent management", () => {
  test("default consent is none", () => {
    const consent = createDefaultConsent();
    assert.equal(consent.level, "none");
    assert.ok(consent.updatedAt > 0);
  });

  test("isConsentSufficient checks level ordering", () => {
    const none = { level: "none", updatedAt: Date.now() };
    const errors = { level: "errors-only", updatedAt: Date.now() };
    const full = { level: "full", updatedAt: Date.now() };

    // none is only sufficient for none
    assert.ok(isConsentSufficient(none, "none"));
    assert.ok(!isConsentSufficient(none, "errors-only"));
    assert.ok(!isConsentSufficient(none, "full"));

    // errors-only is sufficient for none and errors-only
    assert.ok(isConsentSufficient(errors, "none"));
    assert.ok(isConsentSufficient(errors, "errors-only"));
    assert.ok(!isConsentSufficient(errors, "full"));

    // full is sufficient for all
    assert.ok(isConsentSufficient(full, "none"));
    assert.ok(isConsentSufficient(full, "errors-only"));
    assert.ok(isConsentSufficient(full, "full"));
  });
});

// --- TelemetryQueue ---

describe("TelemetryQueue", () => {
  test("drops events when consent is none", () => {
    const queue = new TelemetryQueue({
      consent: createDefaultConsent(), // level = "none"
      flushIntervalMs: 0
    });

    const event = createTelemetryEvent("test.event");
    const accepted = queue.enqueue(event);

    assert.ok(!accepted);
    assert.equal(queue.pending, 0);
    assert.equal(queue.dropped, 1);

    queue.dispose();
  });

  test("accepts events when consent is sufficient", () => {
    const queue = new TelemetryQueue({
      consent: { level: "errors-only", updatedAt: Date.now() },
      flushIntervalMs: 0
    });

    const event = createTelemetryEvent("error.caught");
    const accepted = queue.enqueue(event);

    assert.ok(accepted);
    assert.equal(queue.pending, 1);
    assert.equal(queue.dropped, 0);

    queue.dispose();
  });

  test("auto-flushes when batch size reached", async () => {
    const queue = new TelemetryQueue({
      consent: { level: "full", updatedAt: Date.now() },
      batchSize: 3,
      flushIntervalMs: 0
    });

    queue.enqueue(createTelemetryEvent("e1"));
    queue.enqueue(createTelemetryEvent("e2"));
    assert.equal(queue.pending, 2);

    queue.enqueue(createTelemetryEvent("e3")); // triggers flush
    // flush is async, give it a tick
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(queue.flushedBatches.length, 1);
    assert.equal(queue.flushedBatches[0].length, 3);

    queue.dispose();
  });

  test("manual flush sends buffered events", async () => {
    const queue = new TelemetryQueue({
      consent: { level: "full", updatedAt: Date.now() },
      batchSize: 100,
      flushIntervalMs: 0
    });

    queue.enqueue(createTelemetryEvent("e1"));
    queue.enqueue(createTelemetryEvent("e2"));

    const count = await queue.flush();
    assert.equal(count, 2);
    assert.equal(queue.pending, 0);
    assert.equal(queue.flushedBatches.length, 1);

    queue.dispose();
  });

  test("flush with no buffer returns 0", async () => {
    const queue = new TelemetryQueue({
      consent: { level: "full", updatedAt: Date.now() },
      flushIntervalMs: 0
    });

    const count = await queue.flush();
    assert.equal(count, 0);

    queue.dispose();
  });

  test("sink receives flushed events", async () => {
    const sent = [];
    const queue = new TelemetryQueue({
      consent: { level: "full", updatedAt: Date.now() },
      flushIntervalMs: 0
    });

    queue.attach({
      async send(events) {
        sent.push(...events);
        return true;
      }
    });

    queue.enqueue(createTelemetryEvent("e1"));
    await queue.flush();

    assert.equal(sent.length, 1);
    assert.equal(sent[0].name, "e1");

    queue.dispose();
  });

  test("sink failure re-queues events", async () => {
    let callCount = 0;
    const queue = new TelemetryQueue({
      consent: { level: "full", updatedAt: Date.now() },
      flushIntervalMs: 0
    });

    queue.attach({
      async send() {
        callCount++;
        throw new Error("network failure");
      }
    });

    queue.enqueue(createTelemetryEvent("e1"));
    const count = await queue.flush();

    assert.equal(count, 0); // failed
    assert.equal(queue.pending, 1); // re-queued
    assert.equal(callCount, 1);

    queue.dispose();
  });

  test("updateConsent changes behaviour at runtime", () => {
    const queue = new TelemetryQueue({
      consent: createDefaultConsent(), // none
      flushIntervalMs: 0
    });

    assert.ok(!queue.enqueue(createTelemetryEvent("before")));
    assert.equal(queue.dropped, 1);

    queue.updateConsent("full");
    assert.ok(queue.enqueue(createTelemetryEvent("after")));
    assert.equal(queue.pending, 1);

    queue.dispose();
  });

  test("getConsent returns current state", () => {
    const queue = new TelemetryQueue({
      consent: { level: "errors-only", updatedAt: 1000 },
      flushIntervalMs: 0
    });

    const c = queue.getConsent();
    assert.equal(c.level, "errors-only");

    queue.updateConsent("full");
    assert.equal(queue.getConsent().level, "full");

    queue.dispose();
  });

  test("redacts secret properties on enqueue", async () => {
    const queue = new TelemetryQueue({
      consent: { level: "full", updatedAt: Date.now() },
      flushIntervalMs: 0
    });

    const event = createTelemetryEvent("api.call", {
      modelFamily: "gpt-4",
      api_key: "sk-abcdefghij1234567890abcdef",
      prompt: "write some code"
    });

    queue.enqueue(event);
    await queue.flush();

    const flushed = queue.flushedBatches[0][0];
    assert.equal(flushed.properties.modelFamily, "gpt-4");
    assert.equal(flushed.properties.api_key, "[REDACTED_SECRET]");
    assert.equal(flushed.properties.prompt, "[REDACTED]");

    queue.dispose();
  });

  test("dispose stops timer and clears buffer", () => {
    const queue = new TelemetryQueue({
      consent: { level: "full", updatedAt: Date.now() },
      flushIntervalMs: 1000
    });

    queue.start();
    queue.enqueue(createTelemetryEvent("e1"));
    assert.equal(queue.pending, 1);

    queue.dispose();
    assert.equal(queue.pending, 0);
  });

  test("requiredConsent can be set to full", () => {
    const queue = new TelemetryQueue({
      consent: { level: "errors-only", updatedAt: Date.now() },
      requiredConsent: "full",
      flushIntervalMs: 0
    });

    // errors-only is insufficient for "full" requirement
    assert.ok(!queue.enqueue(createTelemetryEvent("e1")));
    assert.equal(queue.dropped, 1);

    queue.updateConsent("full");
    assert.ok(queue.enqueue(createTelemetryEvent("e2")));

    queue.dispose();
  });
});
