import assert from "node:assert/strict";
import test from "node:test";

import {
  DataAccessError,
  InMemoryPaymentEventRepository,
  InMemoryUserBootstrapRepository,
  SupabasePaymentEventRepository,
  SupabaseUserBootstrapRepository,
  TRIAL_SESSION_LIMIT,
  toBootstrapResponse
} from "../dist/index.js";

test("upsert creates new user with default trial state", async () => {
  const repo = new InMemoryUserBootstrapRepository(() => new Date("2026-03-03T00:00:00.000Z"));
  const state = await repo.upsertUser("user_123");

  assert.equal(state.clerkUserId, "user_123");
  assert.equal(state.totalSessions, 0);
  assert.equal(state.isPremium, false);
});

test("bootstrap response reflects consumed trial sessions", async () => {
  const repo = new InMemoryUserBootstrapRepository(() => new Date("2026-03-03T00:00:00.000Z"));

  await repo.upsertUser("user_123");
  await repo.incrementSessions("user_123", 3);

  const state = await repo.getUserState("user_123");
  assert.ok(state);

  const bootstrap = toBootstrapResponse(state);
  assert.equal(bootstrap.sessionLimit, TRIAL_SESSION_LIMIT);
  assert.equal(bootstrap.remainingSessions, TRIAL_SESSION_LIMIT - 3);
});

test("consumeSessions enforces trial boundary at 8/9/10", async () => {
  const repo = new InMemoryUserBootstrapRepository(() => new Date("2026-03-03T00:00:00.000Z"));
  const userId = "user_boundary";

  await repo.upsertUser(userId);
  await repo.incrementSessions(userId, 8);

  const consumeNinth = await repo.consumeSessions(userId, 1);
  assert.equal(consumeNinth.blocked, false);
  assert.equal(consumeNinth.consumedSessions, 1);
  assert.equal(consumeNinth.remainingSessions, 0);

  const consumeTenth = await repo.consumeSessions(userId, 1);
  assert.equal(consumeTenth.blocked, true);
  assert.equal(consumeTenth.consumedSessions, 0);
  assert.equal(consumeTenth.remainingSessions, 0);
});

test("consumeSessions bypasses trial blocking for premium users", async () => {
  const repo = new InMemoryUserBootstrapRepository(() => new Date("2026-03-03T00:00:00.000Z"));
  const userId = "user_premium";

  await repo.upsertUser(userId);
  await repo.setPremium(userId, true);
  const consumed = await repo.consumeSessions(userId, 2);

  assert.equal(consumed.blocked, false);
  assert.equal(consumed.consumedSessions, 2);
  assert.equal(consumed.remainingSessions, TRIAL_SESSION_LIMIT);
});

test("supabase repository maps upsert + read behavior", async () => {
  const fetchCalls = [];
  const fetchFn = async (url, init) => {
    fetchCalls.push({ url: String(url), init });

    const parsedUrl = String(url);
    if (parsedUrl.includes("/rest/v1/users?on_conflict")) {
      return responseJson(200, [
        {
          clerk_user_id: "user_123",
          total_sessions: 0,
          is_premium: false,
          created_at: "2026-03-03T00:00:00.000Z",
          updated_at: "2026-03-03T00:00:00.000Z"
        }
      ]);
    }

    if (parsedUrl.includes("clerk_user_id=eq.user_123")) {
      return responseJson(200, [
        {
          clerk_user_id: "user_123",
          total_sessions: 0,
          is_premium: false,
          created_at: "2026-03-03T00:00:00.000Z",
          updated_at: "2026-03-03T00:00:00.000Z"
        }
      ]);
    }

    return responseJson(404, { error: "not found" });
  };

  const repo = new SupabaseUserBootstrapRepository({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service_role_key",
    fetchFn
  });

  const created = await repo.upsertUser("user_123");
  assert.equal(created.clerkUserId, "user_123");
  assert.equal(created.isPremium, false);

  const fetched = await repo.getUserState("user_123");
  assert.ok(fetched);
  assert.equal(fetched?.clerkUserId, "user_123");

  assert.equal(fetchCalls.length >= 2, true);
  const upsertCall = fetchCalls[0];
  assert.match(upsertCall.url, /on_conflict=clerk_user_id/);
  assert.equal(upsertCall.init.headers.Authorization, "Bearer service_role_key");
});

test("supabase repository surfaces request failures with correlation ids", async () => {
  const repo = new SupabaseUserBootstrapRepository({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service_role_key",
    fetchFn: async () => responseJson(500, { error: "boom" })
  });

  await assert.rejects(
    () => repo.getUserState("user_123"),
    (error) => error instanceof DataAccessError && error.status === 500
  );
});

test("in-memory payment event repository enforces idempotency and audit logging", async () => {
  const repo = new InMemoryPaymentEventRepository(() => new Date("2026-03-03T00:00:00.000Z"));

  const first = await repo.markWebhookEventProcessed({
    provider: "polar",
    eventId: "evt_123",
    eventType: "order.paid",
    clerkUserId: "user_123"
  });
  const second = await repo.markWebhookEventProcessed({
    provider: "polar",
    eventId: "evt_123",
    eventType: "order.paid",
    clerkUserId: "user_123"
  });

  assert.equal(first, true);
  assert.equal(second, false);

  await repo.logEntitlementEvent({
    clerkUserId: "user_123",
    source: "polar",
    eventType: "order.paid"
  });

  assert.equal(repo.listWebhookEvents().length, 1);
  assert.equal(repo.listEntitlementEvents("user_123").length, 1);
});

test("supabase payment event repository writes webhook + entitlement events", async () => {
  const fetchCalls = [];
  const repo = new SupabasePaymentEventRepository({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service_role_key",
    fetchFn: async (url, init) => {
      fetchCalls.push({ url: String(url), init });

      const parsedUrl = String(url);
      if (parsedUrl.includes("/rest/v1/payment_webhook_events?on_conflict")) {
        return responseJson(200, [
          {
            provider: "polar",
            event_id: "evt_123",
            event_type: "order.paid",
            clerk_user_id: "user_123",
            payload: {},
            received_at: "2026-03-03T00:00:00.000Z"
          }
        ]);
      }

      if (parsedUrl.includes("/rest/v1/entitlement_events?select=")) {
        return responseJson(201, [
          {
            clerk_user_id: "user_123",
            source: "polar",
            event_type: "order.paid",
            payload: {},
            created_at: "2026-03-03T00:00:00.000Z"
          }
        ]);
      }

      return responseJson(404, { error: "not found" });
    }
  });

  const inserted = await repo.markWebhookEventProcessed({
    provider: "polar",
    eventId: "evt_123",
    eventType: "order.paid",
    clerkUserId: "user_123"
  });
  assert.equal(inserted, true);

  await repo.logEntitlementEvent({
    clerkUserId: "user_123",
    source: "polar",
    eventType: "order.paid",
    payload: { amount: 999 }
  });

  assert.equal(fetchCalls.length, 2);
  assert.match(fetchCalls[0].url, /payment_webhook_events/);
  assert.match(fetchCalls[1].url, /entitlement_events/);
});

function responseJson(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}
