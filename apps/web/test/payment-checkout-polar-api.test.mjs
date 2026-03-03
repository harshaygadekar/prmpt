import assert from "node:assert/strict";
import test from "node:test";

import { createPolarCheckoutApi } from "../dist/api/payment-checkout-polar.js";

test("polar checkout API returns checkout URL for valid request", async () => {
  const calls = [];
  const handler = createPolarCheckoutApi({
    entitlementProvider: {
      async startCheckout(input) {
        calls.push(input);
        return {
          provider: "polar",
          checkoutUrl: "https://polar.sh/checkout/chk_123",
          checkoutId: "chk_123"
        };
      },
      async getEntitlement() {
        return {
          userId: "user_123",
          isPremium: false,
          source: "trial"
        };
      },
      async refreshEntitlement() {
        return {
          userId: "user_123",
          isPremium: false,
          source: "trial"
        };
      },
      async reconcileWebhook() {
        return {
          received: true,
          processed: true,
          duplicate: false
        };
      }
    }
  });

  const response = await handler({
    body: {
      userId: "user_123",
      userEmail: "dev@example.com"
    }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    provider: "polar",
    checkoutUrl: "https://polar.sh/checkout/chk_123",
    checkoutId: "chk_123"
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].userId, "user_123");
});

test("polar checkout API rejects invalid payload", async () => {
  const handler = createPolarCheckoutApi({
    entitlementProvider: {
      async startCheckout() {
        throw new Error("should not execute");
      },
      async getEntitlement() {
        throw new Error("should not execute");
      },
      async refreshEntitlement() {
        throw new Error("should not execute");
      },
      async reconcileWebhook() {
        throw new Error("should not execute");
      }
    }
  });

  const response = await handler({
    body: {
      userId: ""
    }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_request");
});

test("polar checkout API returns unavailable when config is missing", async () => {
  const handler = createPolarCheckoutApi();

  const response = await handler({
    body: {
      userId: "user_123"
    }
  });

  assert.equal(response.status, 503);
  assert.equal(response.body.error, "payments_unavailable");
});
