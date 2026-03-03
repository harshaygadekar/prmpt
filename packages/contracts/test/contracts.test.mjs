import assert from "node:assert/strict";
import test from "node:test";

import {
  bootstrapRequestSchema,
  bootstrapResponseSchema,
  entitlementReadResponseSchema,
  paymentCheckoutStartRequestSchema,
  paymentCheckoutStartResponseSchema,
  polarWebhookEventSchema,
  usageConsumeRequestSchema
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
