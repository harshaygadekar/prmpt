import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  InMemoryPaymentEventRepository,
  InMemoryUserBootstrapRepository
} from "@prmpt/data-access";
import { createPolarWebhookApi } from "../dist/api/payment-webhook-polar.js";
import { createPolarEntitlementProvider } from "../dist/entitlement/provider.js";

const WEBHOOK_SECRET = "whsec_test_123";

test("polar webhook applies premium entitlement and ignores replay", async () => {
  const userRepository = new InMemoryUserBootstrapRepository(
    () => new Date("2026-03-03T00:00:00.000Z")
  );
  const paymentEventRepository = new InMemoryPaymentEventRepository(
    () => new Date("2026-03-03T00:00:00.000Z")
  );
  await userRepository.upsertUser("user_123");

  const entitlementProvider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository
  });

  const handler = createPolarWebhookApi({ entitlementProvider });

  const event = {
    id: "evt_paid_123",
    type: "order.paid",
    data: {
      external_customer_id: "user_123"
    }
  };
  const rawBody = JSON.stringify(event);
  const signature = signWebhookPayload(WEBHOOK_SECRET, rawBody);

  const first = await handler({
    rawBody,
    headers: {
      "x-polar-signature": signature
    }
  });

  assert.equal(first.status, 200);
  assert.deepEqual(first.body, {
    received: true,
    processed: true,
    duplicate: false,
    userId: "user_123",
    isPremium: true
  });

  const updated = await userRepository.getUserState("user_123");
  assert.ok(updated);
  assert.equal(updated?.isPremium, true);
  assert.equal(paymentEventRepository.listEntitlementEvents("user_123").length, 1);

  const replay = await handler({
    rawBody,
    headers: {
      "x-polar-signature": signature
    }
  });

  assert.equal(replay.status, 200);
  assert.deepEqual(replay.body, {
    received: true,
    processed: false,
    duplicate: true
  });
  assert.equal(paymentEventRepository.listEntitlementEvents("user_123").length, 1);
});

test("polar webhook rejects invalid signatures", async () => {
  const entitlementProvider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET
  });

  const handler = createPolarWebhookApi({ entitlementProvider });

  const response = await handler({
    rawBody: JSON.stringify({
      id: "evt_123",
      type: "order.paid",
      data: {
        external_customer_id: "user_123"
      }
    }),
    headers: {
      "x-polar-signature": "sha256=invalid"
    }
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "invalid_signature");
});

test("polar webhook validates event payload shape after signature verification", async () => {
  const entitlementProvider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET
  });

  const handler = createPolarWebhookApi({ entitlementProvider });

  const rawBody = JSON.stringify({
    type: "order.paid"
  });
  const signature = signWebhookPayload(WEBHOOK_SECRET, rawBody);

  const response = await handler({
    rawBody,
    headers: {
      "x-polar-signature": signature
    }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_request");
});

function signWebhookPayload(secret, rawBody) {
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${signature}`;
}
