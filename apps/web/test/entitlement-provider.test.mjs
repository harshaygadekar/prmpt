import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  InMemoryPaymentEventRepository,
  InMemoryUserBootstrapRepository
} from "@prmpt/data-access";
import {
  createPolarEntitlementProvider,
  createInMemoryEntitlementCache,
  EntitlementProviderError
} from "../dist/entitlement/provider.js";

const WEBHOOK_SECRET = "whsec_adapter_test";

function signWebhookPayload(secret, rawBody) {
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${signature}`;
}

// ---------------------------------------------------------------------------
// getEntitlement: cache behavior
// ---------------------------------------------------------------------------

test("getEntitlement returns cached value without DB call on cache hit", async () => {
  let dbCalls = 0;
  const userRepository = new InMemoryUserBootstrapRepository();
  const originalGetUserState = userRepository.getUserState.bind(userRepository);
  userRepository.getUserState = async (userId) => {
    dbCalls++;
    return originalGetUserState(userId);
  };

  await userRepository.upsertUser("user_cache");

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository: new InMemoryPaymentEventRepository()
  });

  // First call - cache miss, should hit DB
  const first = await provider.getEntitlement("user_cache");
  assert.equal(first.userId, "user_cache");
  assert.equal(first.isPremium, false);
  const dbCallsAfterFirst = dbCalls;

  // Second call - cache hit, should NOT hit DB again
  const second = await provider.getEntitlement("user_cache");
  assert.equal(second.userId, "user_cache");
  assert.equal(dbCalls, dbCallsAfterFirst, "should not make additional DB call on cache hit");
});

test("getEntitlement fetches from repository on cache miss", async () => {
  const userRepository = new InMemoryUserBootstrapRepository();
  await userRepository.upsertUser("user_miss");

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository: new InMemoryPaymentEventRepository()
  });

  const result = await provider.getEntitlement("user_miss");
  assert.equal(result.userId, "user_miss");
  assert.equal(result.isPremium, false);
  assert.equal(result.source, "trial");
});

test("getEntitlement with forceRefresh bypasses cache", async () => {
  let dbCalls = 0;
  const userRepository = new InMemoryUserBootstrapRepository();
  const originalGetUserState = userRepository.getUserState.bind(userRepository);
  userRepository.getUserState = async (userId) => {
    dbCalls++;
    return originalGetUserState(userId);
  };

  await userRepository.upsertUser("user_force");

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository: new InMemoryPaymentEventRepository()
  });

  // Populate cache
  await provider.getEntitlement("user_force");
  const dbCallsAfterFirst = dbCalls;

  // forceRefresh should bypass cache and hit DB
  await provider.getEntitlement("user_force", { forceRefresh: true });
  assert.ok(dbCalls > dbCallsAfterFirst, "forceRefresh should cause a new DB call");
});

test("getEntitlement cache entry expires after TTL", async () => {
  let currentTime = new Date("2026-03-03T00:00:00.000Z");
  const nowFn = () => currentTime;

  let dbCalls = 0;
  const userRepository = new InMemoryUserBootstrapRepository(nowFn);
  const originalGetUserState = userRepository.getUserState.bind(userRepository);
  userRepository.getUserState = async (userId) => {
    dbCalls++;
    return originalGetUserState(userId);
  };

  await userRepository.upsertUser("user_ttl");

  const cache = createInMemoryEntitlementCache({ ttlMs: 1000, now: nowFn });
  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository: new InMemoryPaymentEventRepository(nowFn),
    cache
  });

  // Populate cache
  await provider.getEntitlement("user_ttl");
  const dbCallsAfterFirst = dbCalls;

  // Still within TTL - should use cache
  currentTime = new Date("2026-03-03T00:00:00.500Z");
  await provider.getEntitlement("user_ttl");
  assert.equal(dbCalls, dbCallsAfterFirst, "should use cache within TTL");

  // Advance past TTL - cache should be expired
  currentTime = new Date("2026-03-03T00:00:02.000Z");
  await provider.getEntitlement("user_ttl");
  assert.ok(dbCalls > dbCallsAfterFirst, "should fetch from DB after cache TTL expires");
});

test("getEntitlement creates user if not found in repository", async () => {
  const userRepository = new InMemoryUserBootstrapRepository();
  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository: new InMemoryPaymentEventRepository()
  });

  // User doesn't exist yet — should be auto-created via upsert fallback
  const result = await provider.getEntitlement("user_new");
  assert.equal(result.userId, "user_new");
  assert.equal(result.isPremium, false);
  assert.equal(result.source, "trial");
});

test("getEntitlement throws on empty userId", async () => {
  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET
  });

  await assert.rejects(
    () => provider.getEntitlement(""),
    (error) => {
      assert.ok(error instanceof EntitlementProviderError);
      assert.equal(error.code, "invalid_request");
      assert.equal(error.status, 400);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// refreshEntitlement
// ---------------------------------------------------------------------------

test("refreshEntitlement delegates to getEntitlement with forceRefresh", async () => {
  const userRepository = new InMemoryUserBootstrapRepository();
  await userRepository.upsertUser("user_ref");
  await userRepository.setPremium("user_ref", true);

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository: new InMemoryPaymentEventRepository()
  });

  // Populate cache with non-premium state first
  await userRepository.setPremium("user_ref", false);
  await provider.getEntitlement("user_ref");

  // Update to premium in DB
  await userRepository.setPremium("user_ref", true);

  // refreshEntitlement should bypass cache and return updated state
  const result = await provider.refreshEntitlement("user_ref");
  assert.equal(result.userId, "user_ref");
  assert.equal(result.isPremium, true);
  assert.equal(result.source, "polar");
});

// ---------------------------------------------------------------------------
// reconcileWebhook: signature verification
// ---------------------------------------------------------------------------

test("reconcileWebhook rejects invalid signature", async () => {
  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET
  });

  await assert.rejects(
    () =>
      provider.reconcileWebhook({
        rawBody: JSON.stringify({ id: "evt_1", type: "order.paid", data: {} }),
        headers: { "x-polar-signature": "sha256=bad" }
      }),
    (error) => {
      assert.ok(error instanceof EntitlementProviderError);
      assert.equal(error.code, "invalid_signature");
      assert.equal(error.status, 401);
      return true;
    }
  );
});

test("reconcileWebhook throws payments_unavailable when webhook secret not configured", async () => {
  const provider = createPolarEntitlementProvider({});

  await assert.rejects(
    () =>
      provider.reconcileWebhook({
        rawBody: "{}",
        headers: {}
      }),
    (error) => {
      assert.ok(error instanceof EntitlementProviderError);
      assert.equal(error.code, "payments_unavailable");
      assert.equal(error.status, 503);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// reconcileWebhook: valid event processing
// ---------------------------------------------------------------------------

test("reconcileWebhook with valid grant event updates premium state and logs audit", async () => {
  const userRepository = new InMemoryUserBootstrapRepository();
  const paymentEventRepository = new InMemoryPaymentEventRepository();
  await userRepository.upsertUser("user_grant");

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository
  });

  const event = {
    id: "evt_grant_1",
    type: "order.paid",
    data: { external_customer_id: "user_grant" }
  };
  const rawBody = JSON.stringify(event);
  const signature = signWebhookPayload(WEBHOOK_SECRET, rawBody);

  const result = await provider.reconcileWebhook({
    rawBody,
    headers: { "x-polar-signature": signature }
  });

  assert.equal(result.received, true);
  assert.equal(result.processed, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.userId, "user_grant");
  assert.equal(result.isPremium, true);

  // Verify DB was updated
  const state = await userRepository.getUserState("user_grant");
  assert.equal(state?.isPremium, true);

  // Verify audit log
  const events = paymentEventRepository.listEntitlementEvents("user_grant");
  assert.equal(events.length, 1);
  assert.equal(events[0].source, "polar");
  assert.equal(events[0].eventType, "order.paid");
});

test("reconcileWebhook updates entitlement cache after processing", async () => {
  let currentTime = new Date("2026-03-03T00:00:00.000Z");
  const nowFn = () => currentTime;

  const userRepository = new InMemoryUserBootstrapRepository(nowFn);
  const paymentEventRepository = new InMemoryPaymentEventRepository(nowFn);
  await userRepository.upsertUser("user_cache_update");

  const cache = createInMemoryEntitlementCache({ ttlMs: 60_000, now: nowFn });
  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository,
    cache
  });

  // Populate cache with trial state
  const initial = await provider.getEntitlement("user_cache_update");
  assert.equal(initial.isPremium, false);

  // Process a grant webhook
  const event = {
    id: "evt_cache_1",
    type: "order.paid",
    data: { external_customer_id: "user_cache_update" }
  };
  const rawBody = JSON.stringify(event);
  const signature = signWebhookPayload(WEBHOOK_SECRET, rawBody);

  await provider.reconcileWebhook({
    rawBody,
    headers: { "x-polar-signature": signature }
  });

  // Cache should now reflect premium state (no forceRefresh needed)
  const afterWebhook = await provider.getEntitlement("user_cache_update");
  assert.equal(afterWebhook.isPremium, true);
  assert.equal(afterWebhook.source, "polar");
});

// ---------------------------------------------------------------------------
// reconcileWebhook: idempotency (duplicate replay)
// ---------------------------------------------------------------------------

test("reconcileWebhook replay returns duplicate without reprocessing", async () => {
  const userRepository = new InMemoryUserBootstrapRepository();
  const paymentEventRepository = new InMemoryPaymentEventRepository();
  await userRepository.upsertUser("user_dup");

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository
  });

  const event = {
    id: "evt_dup_1",
    type: "order.paid",
    data: { external_customer_id: "user_dup" }
  };
  const rawBody = JSON.stringify(event);
  const signature = signWebhookPayload(WEBHOOK_SECRET, rawBody);

  // First call - should process
  const first = await provider.reconcileWebhook({
    rawBody,
    headers: { "x-polar-signature": signature }
  });
  assert.equal(first.processed, true);
  assert.equal(first.duplicate, false);

  // Replay - should be detected as duplicate
  const replay = await provider.reconcileWebhook({
    rawBody,
    headers: { "x-polar-signature": signature }
  });
  assert.equal(replay.processed, false);
  assert.equal(replay.duplicate, true);

  // Audit log should have exactly 1 entry (not 2)
  assert.equal(paymentEventRepository.listEntitlementEvents("user_dup").length, 1);
});

// ---------------------------------------------------------------------------
// reconcileWebhook: unrecognized event type
// ---------------------------------------------------------------------------

test("reconcileWebhook with unrecognized event type acknowledges without entitlement change", async () => {
  const userRepository = new InMemoryUserBootstrapRepository();
  const paymentEventRepository = new InMemoryPaymentEventRepository();

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository
  });

  const event = {
    id: "evt_unknown_1",
    type: "customer.updated",
    data: { external_customer_id: "user_unknown" }
  };
  const rawBody = JSON.stringify(event);
  const signature = signWebhookPayload(WEBHOOK_SECRET, rawBody);

  const result = await provider.reconcileWebhook({
    rawBody,
    headers: { "x-polar-signature": signature }
  });

  assert.equal(result.received, true);
  assert.equal(result.processed, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.userId, undefined);
  assert.equal(result.isPremium, undefined);

  // No entitlement audit events
  assert.equal(paymentEventRepository.listEntitlementEvents().length, 0);
});

// ---------------------------------------------------------------------------
// reconcileWebhook: invalid JSON body
// ---------------------------------------------------------------------------

test("reconcileWebhook rejects non-JSON body", async () => {
  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET
  });

  const rawBody = "not-valid-json";
  const signature = signWebhookPayload(WEBHOOK_SECRET, rawBody);

  await assert.rejects(
    () =>
      provider.reconcileWebhook({
        rawBody,
        headers: { "x-polar-signature": signature }
      }),
    (error) => {
      assert.ok(error instanceof EntitlementProviderError);
      assert.equal(error.code, "invalid_request");
      assert.equal(error.status, 400);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// startCheckout: gateway behavior
// ---------------------------------------------------------------------------

test("startCheckout without configured gateway throws payments_unavailable", async () => {
  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET
  });

  await assert.rejects(
    () => provider.startCheckout({ userId: "user_123" }),
    (error) => {
      assert.ok(error instanceof EntitlementProviderError);
      assert.equal(error.code, "payments_unavailable");
      assert.equal(error.status, 503);
      return true;
    }
  );
});

test("startCheckout with gateway delegates correctly", async () => {
  const calls = [];
  const mockGateway = {
    async createCheckoutSession(input) {
      calls.push(input);
      return {
        checkoutUrl: "https://polar.sh/checkout/session_123",
        checkoutId: "session_123"
      };
    }
  };

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    checkoutGateway: mockGateway
  });

  const result = await provider.startCheckout({
    userId: "user_checkout",
    userEmail: "test@example.com"
  });

  assert.equal(result.provider, "polar");
  assert.equal(result.checkoutUrl, "https://polar.sh/checkout/session_123");
  assert.equal(result.checkoutId, "session_123");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].userId, "user_checkout");
  assert.equal(calls[0].userEmail, "test@example.com");
});

test("startCheckout rejects invalid request", async () => {
  const mockGateway = {
    async createCheckoutSession() {
      throw new Error("should not execute");
    }
  };

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    checkoutGateway: mockGateway
  });

  await assert.rejects(
    () => provider.startCheckout({ userId: "" }),
    (error) => {
      assert.ok(error instanceof EntitlementProviderError);
      assert.equal(error.code, "invalid_request");
      assert.equal(error.status, 400);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// revoke event
// ---------------------------------------------------------------------------

test("reconcileWebhook with revoke event removes premium state", async () => {
  const userRepository = new InMemoryUserBootstrapRepository();
  const paymentEventRepository = new InMemoryPaymentEventRepository();
  await userRepository.upsertUser("user_revoke");
  await userRepository.setPremium("user_revoke", true);

  const provider = createPolarEntitlementProvider({
    webhookSecret: WEBHOOK_SECRET,
    userRepository,
    paymentEventRepository
  });

  const event = {
    id: "evt_revoke_1",
    type: "subscription.canceled",
    data: { external_customer_id: "user_revoke" }
  };
  const rawBody = JSON.stringify(event);
  const signature = signWebhookPayload(WEBHOOK_SECRET, rawBody);

  const result = await provider.reconcileWebhook({
    rawBody,
    headers: { "x-polar-signature": signature }
  });

  assert.equal(result.received, true);
  assert.equal(result.processed, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.userId, "user_revoke");
  assert.equal(result.isPremium, false);

  const state = await userRepository.getUserState("user_revoke");
  assert.equal(state?.isPremium, false);
});
