import assert from "node:assert/strict";
import test from "node:test";

import {
  createEntitlementClient,
  EntitlementClientError,
  createUpgradeManager,
  formatUserError,
  getUserFacingMessage,
  getSupportCode
} from "../dist/entitlement/index.js";

// --- Error mapping tests ---

test("getUserFacingMessage returns known messages", () => {
  assert.match(getUserFacingMessage("trial_exhausted"), /free trial/i);
  assert.match(getUserFacingMessage("network_error"), /internet/i);
});

test("getUserFacingMessage returns fallback for unknown codes", () => {
  assert.match(getUserFacingMessage("totally_unknown"), /unexpected/i);
});

test("getSupportCode returns known codes", () => {
  assert.equal(getSupportCode("trial_exhausted"), "E-TRIAL-001");
  assert.equal(getSupportCode("checkout_failed"), "E-PAY-004");
});

test("formatUserError combines message and support code", () => {
  const formatted = formatUserError("network_error");
  assert.match(formatted, /internet/i);
  assert.match(formatted, /E-NET-001/);
});

// --- EntitlementClient tests ---

test("entitlement client fetches entitlement status", async () => {
  const client = createEntitlementClient({
    baseUrl: "http://localhost:3000",
    fetchFn: async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, "/api/v1/entitlement");
      assert.equal(url.searchParams.get("userId"), "user_123");
      return new Response(JSON.stringify({ userId: "user_123", isPremium: false, source: "trial" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  const result = await client.getEntitlement("user_123");
  assert.equal(result.userId, "user_123");
  assert.equal(result.isPremium, false);
});

test("entitlement client passes forceRefresh param", async () => {
  const client = createEntitlementClient({
    baseUrl: "http://localhost:3000",
    fetchFn: async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("refresh"), "true");
      return new Response(JSON.stringify({ userId: "user_123", isPremium: true, source: "polar" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  const result = await client.getEntitlement("user_123", { forceRefresh: true });
  assert.equal(result.isPremium, true);
});

test("entitlement client throws EntitlementClientError on non-ok response", async () => {
  const client = createEntitlementClient({
    baseUrl: "http://localhost:3000",
    fetchFn: async () =>
      new Response(JSON.stringify({ error: "payments_unavailable", message: "Service down" }), {
        status: 503,
        headers: { "content-type": "application/json" }
      })
  });

  await assert.rejects(
    () => client.getEntitlement("user_123"),
    (error) => {
      assert.ok(error instanceof EntitlementClientError);
      assert.equal(error.status, 503);
      assert.equal(error.errorCode, "payments_unavailable");
      return true;
    }
  );
});

test("entitlement client starts checkout", async () => {
  const client = createEntitlementClient({
    baseUrl: "http://localhost:3000",
    fetchFn: async (input, init) => {
      assert.equal(String(input), "http://localhost:3000/api/v1/payment/checkout/polar");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.userId, "user_123");
      return new Response(
        JSON.stringify({ provider: "polar", checkoutUrl: "https://polar.sh/checkout/abc" }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
  });

  const result = await client.startCheckout("user_123");
  assert.equal(result.checkoutUrl, "https://polar.sh/checkout/abc");
});

test("entitlement client consumes usage", async () => {
  const client = createEntitlementClient({
    baseUrl: "http://localhost:3000",
    fetchFn: async (input, init) => {
      assert.equal(String(input), "http://localhost:3000/api/v1/usage/consume");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.userId, "user_123");
      assert.equal(body.sessionCount, 1);
      return new Response(
        JSON.stringify({ userId: "user_123", consumedSessions: 5, remainingSessions: 4, isPremium: false }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
  });

  const result = await client.consumeUsage("user_123");
  assert.equal(result.remainingSessions, 4);
});

// --- UpgradeManager tests ---

test("upgrade manager checkStatus resolves premium state", async () => {
  const manager = createUpgradeManager({
    client: createEntitlementClient({
      baseUrl: "http://localhost:3000",
      fetchFn: async () =>
        new Response(JSON.stringify({ userId: "user_1", isPremium: true, source: "polar" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    }),
    openExternal: async () => true,
    showInfo: () => {},
    showWarning: async () => undefined,
    showError: () => {}
  });

  const ctx = await manager.checkStatus("user_1");
  assert.equal(ctx.state, "premium_active");
  assert.equal(ctx.isPremium, true);
});

test("upgrade manager checkUsageAndPrompt triggers warning at threshold", async () => {
  const warnings = [];
  const manager = createUpgradeManager({
    client: createEntitlementClient({
      baseUrl: "http://localhost:3000",
      fetchFn: async () => new Response("{}", { status: 200 })
    }),
    openExternal: async () => true,
    showInfo: () => {},
    showWarning: async (msg) => {
      warnings.push(msg);
      return undefined;
    },
    showError: () => {}
  });

  const ctx = await manager.checkUsageAndPrompt("user_1", 2);
  assert.equal(ctx.state, "trial_warning");
  assert.equal(ctx.remainingSessions, 2);
  // Give the void promise time to resolve
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /2 free sessions/);
});

test("upgrade manager checkUsageAndPrompt triggers upgrade prompt at zero", async () => {
  const warningCalls = [];
  const manager = createUpgradeManager({
    client: createEntitlementClient({
      baseUrl: "http://localhost:3000",
      fetchFn: async () =>
        new Response(
          JSON.stringify({ provider: "polar", checkoutUrl: "https://polar.sh/checkout/xyz" }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    }),
    openExternal: async () => true,
    showInfo: () => {},
    showWarning: async (msg, ...actions) => {
      warningCalls.push({ msg, actions });
      return "Dismiss";
    },
    showError: () => {}
  });

  const ctx = await manager.checkUsageAndPrompt("user_1", 0);
  assert.equal(ctx.state, "trial_exhausted");
  assert.equal(warningCalls.length, 1);
  assert.ok(warningCalls[0].actions.includes("Upgrade Now"));
});

test("upgrade manager refreshEntitlement shows premium confirmation", async () => {
  const infos = [];
  const manager = createUpgradeManager({
    client: createEntitlementClient({
      baseUrl: "http://localhost:3000",
      fetchFn: async () =>
        new Response(JSON.stringify({ userId: "user_1", isPremium: true, source: "polar" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    }),
    openExternal: async () => true,
    showInfo: (msg) => infos.push(msg),
    showWarning: async () => undefined,
    showError: () => {}
  });

  const ctx = await manager.refreshEntitlement("user_1");
  assert.equal(ctx.state, "premium_active");
  assert.equal(ctx.isPremium, true);
  assert.equal(infos.length, 1);
  assert.match(infos[0], /Premium subscription active/i);
});

test("upgrade manager refreshEntitlement handles error gracefully", async () => {
  const errors = [];
  const manager = createUpgradeManager({
    client: createEntitlementClient({
      baseUrl: "http://localhost:3000",
      fetchFn: async () =>
        new Response(JSON.stringify({ error: "provider_error", message: "down" }), { status: 502 })
    }),
    openExternal: async () => true,
    showInfo: () => {},
    showWarning: async () => undefined,
    showError: (msg) => errors.push(msg)
  });

  const ctx = await manager.refreshEntitlement("user_1");
  assert.equal(ctx.state, "entitlement_error");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /E-PAY-003/);
});

test("upgrade manager promptUpgrade handles checkout failure", async () => {
  const errors = [];
  const manager = createUpgradeManager({
    client: createEntitlementClient({
      baseUrl: "http://localhost:3000",
      fetchFn: async () =>
        new Response(JSON.stringify({ error: "payments_unavailable", message: "503" }), {
          status: 503
        })
    }),
    openExternal: async () => true,
    showInfo: () => {},
    showWarning: async () => "Upgrade Now",
    showError: (msg) => errors.push(msg)
  });

  await manager.promptUpgrade("user_1");
  const ctx = manager.getLastContext();
  assert.equal(ctx.state, "checkout_failed");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /E-PAY-001/);
});
