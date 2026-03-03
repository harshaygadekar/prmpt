import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  extractBearerToken,
  assertScopes,
  ApiAuthError,
  InMemoryReplayGuard,
  withAuthGuard,
  createMockVerifier
} from "../dist/api/auth-guard.js";

// --- extractBearerToken ---

describe("extractBearerToken", () => {
  test("extracts token from valid Bearer header", () => {
    const token = extractBearerToken("Bearer abc123xyz");
    assert.equal(token, "abc123xyz");
  });

  test("case-insensitive Bearer prefix", () => {
    const token = extractBearerToken("bearer mytoken");
    assert.equal(token, "mytoken");
  });

  test("throws on missing header", () => {
    assert.throws(
      () => extractBearerToken(undefined),
      (err) => err instanceof ApiAuthError && err.code === "missing_authorization"
    );
  });

  test("throws on empty header", () => {
    assert.throws(
      () => extractBearerToken(""),
      (err) => err instanceof ApiAuthError && err.code === "missing_authorization"
    );
  });

  test("throws on non-Bearer scheme", () => {
    assert.throws(
      () => extractBearerToken("Basic dXNlcjpwYXNz"),
      (err) => err instanceof ApiAuthError && err.code === "invalid_token"
    );
  });

  test("throws on Bearer without token", () => {
    assert.throws(
      () => extractBearerToken("Bearer "),
      (err) => err instanceof ApiAuthError && err.code === "invalid_token"
    );
  });
});

// --- assertScopes ---

describe("assertScopes", () => {
  test("passes when all required scopes present", () => {
    const ctx = { userId: "u1", scopes: ["usage:consume", "entitlement:read"], tokenIssuedAt: Date.now() };
    assert.doesNotThrow(() => assertScopes(ctx, ["usage:consume"]));
  });

  test("admin scope bypasses all checks", () => {
    const ctx = { userId: "u1", scopes: ["admin"], tokenIssuedAt: Date.now() };
    assert.doesNotThrow(() => assertScopes(ctx, ["usage:consume", "entitlement:read", "webhook:polar"]));
  });

  test("throws on missing scope", () => {
    const ctx = { userId: "u1", scopes: ["usage:consume"], tokenIssuedAt: Date.now() };
    assert.throws(
      () => assertScopes(ctx, ["entitlement:read"]),
      (err) => err instanceof ApiAuthError && err.code === "insufficient_scope" && err.httpStatus === 403
    );
  });

  test("passes with empty required scopes", () => {
    const ctx = { userId: "u1", scopes: [], tokenIssuedAt: Date.now() };
    assert.doesNotThrow(() => assertScopes(ctx, []));
  });
});

// --- InMemoryReplayGuard ---

describe("InMemoryReplayGuard", () => {
  test("first request is not a replay", () => {
    const guard = new InMemoryReplayGuard();
    assert.ok(!guard.check("req-001"));
  });

  test("duplicate request ID is a replay", () => {
    const guard = new InMemoryReplayGuard();
    guard.check("req-001");
    assert.ok(guard.check("req-001"));
  });

  test("different request IDs are not replays", () => {
    const guard = new InMemoryReplayGuard();
    guard.check("req-001");
    assert.ok(!guard.check("req-002"));
  });

  test("prunes expired entries when over maxSize", () => {
    let now = 1000;
    const guard = new InMemoryReplayGuard({
      ttlMs: 100,
      maxSize: 2,
      now: () => now
    });

    guard.check("req-001"); // ts=1000
    guard.check("req-002"); // ts=1000

    // Advance time past TTL
    now = 1200;
    guard.check("req-003"); // triggers prune

    // req-001 should be pruned, so not detected as replay
    assert.ok(!guard.check("req-001"));
  });

  test("tracks size correctly", () => {
    const guard = new InMemoryReplayGuard();
    guard.check("a");
    guard.check("b");
    guard.check("c");
    assert.equal(guard.size, 3);
  });
});

// --- withAuthGuard ---

describe("withAuthGuard", () => {
  const defaultContext = {
    userId: "user_123",
    scopes: ["usage:consume", "entitlement:read"],
    tokenIssuedAt: Date.now()
  };

  test("passes authenticated request to handler", async () => {
    const verifier = createMockVerifier({ defaultContext });
    const guarded = withAuthGuard(
      async (req, ctx) => ({
        status: 200,
        body: { userId: ctx.userId }
      }),
      { verifier }
    );

    const resp = await guarded({
      headers: { authorization: "Bearer valid-token" }
    });

    assert.equal(resp.status, 200);
    assert.equal(resp.body.userId, "user_123");
  });

  test("rejects missing Authorization header", async () => {
    const verifier = createMockVerifier({ defaultContext });
    const guarded = withAuthGuard(
      async () => ({ status: 200, body: {} }),
      { verifier }
    );

    const resp = await guarded({ headers: {} });
    assert.equal(resp.status, 401);
    assert.equal(resp.body.error, "missing_authorization");
  });

  test("rejects invalid token", async () => {
    // Verifier with no valid tokens and no default
    const verifier = createMockVerifier({});
    const guarded = withAuthGuard(
      async () => ({ status: 200, body: {} }),
      { verifier }
    );

    const resp = await guarded({
      headers: { authorization: "Bearer bad-token" }
    });
    assert.equal(resp.status, 401);
    assert.equal(resp.body.error, "invalid_token");
  });

  test("rejects insufficient scope", async () => {
    const verifier = createMockVerifier({
      defaultContext: {
        userId: "u1",
        scopes: ["entitlement:read"],
        tokenIssuedAt: Date.now()
      }
    });

    const guarded = withAuthGuard(
      async () => ({ status: 200, body: {} }),
      { verifier, requiredScopes: ["usage:consume"] }
    );

    const resp = await guarded({
      headers: { authorization: "Bearer token" }
    });
    assert.equal(resp.status, 403);
    assert.equal(resp.body.error, "insufficient_scope");
  });

  test("detects replay via x-request-id", async () => {
    const verifier = createMockVerifier({ defaultContext });
    const replayGuard = new InMemoryReplayGuard();

    const guarded = withAuthGuard(
      async () => ({ status: 200, body: {} }),
      { verifier, replayGuard }
    );

    // First request
    const resp1 = await guarded({
      headers: { authorization: "Bearer token", "x-request-id": "req-001" }
    });
    assert.equal(resp1.status, 200);

    // Replay
    const resp2 = await guarded({
      headers: { authorization: "Bearer token", "x-request-id": "req-001" }
    });
    assert.equal(resp2.status, 409);
    assert.equal(resp2.body.error, "replay_detected");
  });

  test("allows requests without request-id even with replay guard", async () => {
    const verifier = createMockVerifier({ defaultContext });
    const replayGuard = new InMemoryReplayGuard();

    const guarded = withAuthGuard(
      async () => ({ status: 200, body: {} }),
      { verifier, replayGuard }
    );

    // No x-request-id header — should not trigger replay check
    const resp = await guarded({
      headers: { authorization: "Bearer token" }
    });
    assert.equal(resp.status, 200);
  });

  test("maps token to specific auth context", async () => {
    const validTokens = new Map();
    validTokens.set("token-a", {
      userId: "alice",
      scopes: ["usage:consume"],
      tokenIssuedAt: Date.now()
    });
    validTokens.set("token-b", {
      userId: "bob",
      scopes: ["entitlement:read"],
      tokenIssuedAt: Date.now()
    });

    const verifier = createMockVerifier({ validTokens });

    const guarded = withAuthGuard(
      async (_req, ctx) => ({
        status: 200,
        body: { userId: ctx.userId, scopes: ctx.scopes }
      }),
      { verifier }
    );

    const respA = await guarded({
      headers: { authorization: "Bearer token-a" }
    });
    assert.equal(respA.body.userId, "alice");

    const respB = await guarded({
      headers: { authorization: "Bearer token-b" }
    });
    assert.equal(respB.body.userId, "bob");
  });

  test("custom request-id header name", async () => {
    const verifier = createMockVerifier({ defaultContext });
    const replayGuard = new InMemoryReplayGuard();

    const guarded = withAuthGuard(
      async () => ({ status: 200, body: {} }),
      { verifier, replayGuard, requestIdHeader: "x-idempotency-key" }
    );

    const resp1 = await guarded({
      headers: { authorization: "Bearer token", "x-idempotency-key": "idem-001" }
    });
    assert.equal(resp1.status, 200);

    const resp2 = await guarded({
      headers: { authorization: "Bearer token", "x-idempotency-key": "idem-001" }
    });
    assert.equal(resp2.status, 409);
  });

  test("admin scope bypasses required scopes", async () => {
    const verifier = createMockVerifier({
      defaultContext: {
        userId: "admin-user",
        scopes: ["admin"],
        tokenIssuedAt: Date.now()
      }
    });

    const guarded = withAuthGuard(
      async (_req, ctx) => ({ status: 200, body: { userId: ctx.userId } }),
      { verifier, requiredScopes: ["usage:consume", "entitlement:read", "webhook:polar"] }
    );

    const resp = await guarded({
      headers: { authorization: "Bearer admin-token" }
    });
    assert.equal(resp.status, 200);
    assert.equal(resp.body.userId, "admin-user");
  });
});
