import assert from "node:assert/strict";
import test from "node:test";

import {
  bootstrapRequestSchema,
  bootstrapResponseSchema,
  entitlementReadResponseSchema,
  paymentCheckoutStartRequestSchema,
  paymentCheckoutStartResponseSchema,
  polarWebhookEventSchema,
  usageConsumeRequestSchema,
  techniqueIdSchema,
  diffResultSchema,
  diffSegmentSchema,
  wizardStateSchema,
  wizardStepSchema
} from "../dist/index.js";

test("bootstrap response accepts valid payload", () => {
  const payload = {
    userId: "user_123",
    sessionLimit: 9,
    remainingSessions: 4,
    isPremium: false
  };

  const parsed = bootstrapResponseSchema.parse(payload);
  assert.equal(parsed.userId, "user_123");
  assert.equal(parsed.remainingSessions, 4);
});

test("bootstrap request requires clerk user id", () => {
  assert.throws(() => {
    bootstrapRequestSchema.parse({
      platform: "vscode"
    });
  });
});

test("usage consume request rejects zero session count", () => {
  assert.throws(() => {
    usageConsumeRequestSchema.parse({ userId: "user_123", sessionCount: 0 });
  });
});

test("entitlement response rejects non-boolean premium flag", () => {
  assert.throws(() => {
    entitlementReadResponseSchema.parse({
      userId: "user_123",
      isPremium: "yes"
    });
  });
});

test("payment checkout request enforces user id and url shapes", () => {
  const parsed = paymentCheckoutStartRequestSchema.parse({
    userId: "user_123",
    successUrl: "https://prmpt.dev/success",
    cancelUrl: "https://prmpt.dev/cancel"
  });

  assert.equal(parsed.userId, "user_123");
  assert.equal(parsed.successUrl, "https://prmpt.dev/success");

  assert.throws(() => {
    paymentCheckoutStartRequestSchema.parse({
      userId: "",
      successUrl: "not-a-url"
    });
  });
});

test("payment checkout response requires polar provider and checkout url", () => {
  const parsed = paymentCheckoutStartResponseSchema.parse({
    provider: "polar",
    checkoutUrl: "https://polar.sh/checkout/session_123"
  });
  assert.equal(parsed.provider, "polar");

  assert.throws(() => {
    paymentCheckoutStartResponseSchema.parse({
      provider: "unknown",
      checkoutUrl: "https://polar.sh/checkout/session_123"
    });
  });
});

test("polar webhook event requires id and type", () => {
  const parsed = polarWebhookEventSchema.parse({
    id: "evt_123",
    type: "order.paid",
    data: {
      external_customer_id: "user_123"
    }
  });

  assert.equal(parsed.id, "evt_123");

  assert.throws(() => {
    polarWebhookEventSchema.parse({
      type: "order.paid"
    });
  });
});

// --- Technique ID contract (ST-10-01) ---

test("techniqueIdSchema accepts valid technique IDs", () => {
  const ids = ["xml-tagging", "role-priming", "step-decomposition", "output-constraints", "few-shot-priming", "chain-of-thought", "simplification"];
  for (const id of ids) {
    const parsed = techniqueIdSchema.parse(id);
    assert.equal(parsed, id);
  }
});

test("techniqueIdSchema rejects invalid technique ID", () => {
  assert.throws(() => techniqueIdSchema.parse("unknown-technique"));
});

// --- P2 Bridge contract tests (ST-10-05) ---

test("diffSegmentSchema accepts valid segment", () => {
  const segment = {
    type: "added",
    content: "+ new line of text",
    lineStart: 5,
    lineEnd: 5
  };
  const parsed = diffSegmentSchema.parse(segment);
  assert.equal(parsed.type, "added");
  assert.equal(parsed.lineStart, 5);
});

test("diffResultSchema accepts valid diff result", () => {
  const diff = {
    originalPrompt: "Explain this concept",
    optimizedPrompt: "You are an expert. Explain this concept clearly.",
    segments: [
      { type: "added", content: "You are an expert. ", lineStart: 0, lineEnd: 0 },
      { type: "unchanged", content: "Explain this concept", lineStart: 0, lineEnd: 0 },
      { type: "added", content: " clearly.", lineStart: 0, lineEnd: 0 }
    ],
    totalAdditions: 2,
    totalRemovals: 0,
    similarityScore: 0.72
  };
  const parsed = diffResultSchema.parse(diff);
  assert.equal(parsed.segments.length, 3);
  assert.equal(parsed.similarityScore, 0.72);
});

test("diffResultSchema rejects invalid similarity score", () => {
  assert.throws(() => diffResultSchema.parse({
    originalPrompt: "a",
    optimizedPrompt: "b",
    segments: [],
    totalAdditions: 0,
    totalRemovals: 0,
    similarityScore: 1.5
  }));
});

test("wizardStepSchema accepts valid step", () => {
  const step = {
    id: "step-1",
    type: "model_selection",
    label: "Select Model",
    order: 0,
    completed: false
  };
  const parsed = wizardStepSchema.parse(step);
  assert.equal(parsed.type, "model_selection");
  assert.equal(parsed.completed, false);
});

test("wizardStateSchema accepts valid wizard state", () => {
  const state = {
    sessionId: "wiz-123",
    currentStepIndex: 0,
    steps: [
      { id: "s1", type: "model_selection", label: "Select Model", order: 0, completed: false },
      { id: "s2", type: "prompt_input", label: "Enter Prompt", order: 1, completed: false }
    ],
    status: "in_progress",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  };
  const parsed = wizardStateSchema.parse(state);
  assert.equal(parsed.steps.length, 2);
  assert.equal(parsed.status, "in_progress");
});

test("wizardStateSchema rejects empty steps", () => {
  assert.throws(() => wizardStateSchema.parse({
    sessionId: "wiz-123",
    currentStepIndex: 0,
    steps: [],
    status: "in_progress",
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01"
  }));
});
