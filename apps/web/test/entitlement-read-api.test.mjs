import assert from "node:assert/strict";
import test from "node:test";

import { createEntitlementReadApi } from "../dist/api/entitlement-read.js";

/**
 * Creates a mock EntitlementProvider for testing the entitlement-read API handler.
 * Follows the same pattern as payment-checkout-polar-api.test.mjs.
 */
function createMockEntitlementProvider(overrides = {}) {
  const calls = { getEntitlement: [], refreshEntitlement: [] };
  return {
    calls,
    provider: {
      async getEntitlement(userId, options) {
        calls.getEntitlement.push({ userId, options });
        if (overrides.getEntitlement) {
          return overrides.getEntitlement(userId, options);
        }
        return {
          userId,
          isPremium: false,
          source: "trial"
        };
      },
      async refreshEntitlement(userId) {
        calls.refreshEntitlement.push({ userId });
        if (overrides.refreshEntitlement) {
          return overrides.refreshEntitlement(userId);
        }
        return {
          userId,
          isPremium: false,
          source: "trial"
        };
      },
      async startCheckout() {
        throw new Error("should not execute in entitlement read tests");
      },
      async reconcileWebhook() {
        throw new Error("should not execute in entitlement read tests");
      }
    }
  };
}

test("entitlement read returns user entitlement for valid userId", async () => {
  const mock = createMockEntitlementProvider({
    getEntitlement(userId) {
      return { userId, isPremium: true, source: "polar" };
    }
  });

  const handler = createEntitlementReadApi({
    entitlementProvider: mock.provider
  });

  const response = await handler({
    query: { userId: "user_abc" }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    userId: "user_abc",
    isPremium: true,
    source: "polar"
  });
  assert.equal(mock.calls.getEntitlement.length, 1);
  assert.equal(mock.calls.getEntitlement[0].userId, "user_abc");
  assert.equal(mock.calls.getEntitlement[0].options?.forceRefresh, false);
});

test("entitlement read passes forceRefresh when refresh=true query param", async () => {
  const mock = createMockEntitlementProvider({
    getEntitlement(userId, options) {
      return {
        userId,
        isPremium: options?.forceRefresh ? true : false,
        source: options?.forceRefresh ? "polar" : "trial"
      };
    }
  });

  const handler = createEntitlementReadApi({
    entitlementProvider: mock.provider
  });

  const response = await handler({
    query: { userId: "user_refresh", refresh: "true" }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    userId: "user_refresh",
    isPremium: true,
    source: "polar"
  });
  assert.equal(mock.calls.getEntitlement.length, 1);
  assert.equal(mock.calls.getEntitlement[0].options?.forceRefresh, true);
});

test("entitlement read rejects missing userId with 400", async () => {
  const mock = createMockEntitlementProvider();

  const handler = createEntitlementReadApi({
    entitlementProvider: mock.provider
  });

  const response = await handler({
    query: {}
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_request");
  assert.ok(response.body.issues);
  assert.equal(mock.calls.getEntitlement.length, 0);
});

test("entitlement read rejects empty userId with 400", async () => {
  const mock = createMockEntitlementProvider();

  const handler = createEntitlementReadApi({
    entitlementProvider: mock.provider
  });

  const response = await handler({
    query: { userId: "" }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_request");
  assert.equal(mock.calls.getEntitlement.length, 0);
});

test("entitlement read returns 503 when provider is not configured", async () => {
  const handler = createEntitlementReadApi();

  const response = await handler({
    query: { userId: "user_123" }
  });

  assert.equal(response.status, 503);
  assert.equal(response.body.error, "payments_unavailable");
});
