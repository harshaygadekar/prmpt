import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ProviderKeyManager,
  ProviderModeManager,
  createSettingsGetHandler,
  createSettingsUpdateHandler,
  createProviderStatusHandler
} from "../dist/settings/index.js";

import {
  createRequest,
  HostMessageRouter,
  MESSAGE_TYPES
} from "../dist/messaging/index.js";

// --- Helpers ---

function createMockSecretStorage() {
  const store = new Map();
  return {
    async get(key) {
      return store.get(key);
    },
    async store(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    _store: store
  };
}

function createHealthyHealthCheck() {
  return async (_providerId, _apiKey) => ({
    ok: true,
    detail: "Connected"
  });
}

function createUnhealthyHealthCheck() {
  return async () => ({
    ok: false,
    detail: "Connection refused"
  });
}

function createErrorHealthCheck() {
  return async () => {
    throw new Error("Network timeout");
  };
}

// --- ProviderKeyManager ---

describe("ProviderKeyManager", () => {
  test("addKey stores and masks key", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    const entry = await mgr.addKey("openai", "sk-1234567890abcdef");
    assert.equal(entry.providerId, "openai");
    assert.equal(entry.maskedKey, "sk-1...cdef");
    assert.ok(entry.addedAt > 0);
    assert.equal(entry.lastVerified, undefined);
    assert.equal(entry.healthy, undefined);
  });

  test("getKey retrieves stored key", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await mgr.addKey("anthropic", "sk-ant-secret");
    const key = await mgr.getKey("anthropic");
    assert.equal(key, "sk-ant-secret");
  });

  test("hasKey checks existence", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    assert.ok(!mgr.hasKey("openai"));
    await mgr.addKey("openai", "sk-test");
    assert.ok(mgr.hasKey("openai"));
  });

  test("removeKey deletes key and metadata", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await mgr.addKey("openai", "sk-test");
    assert.ok(mgr.hasKey("openai"));

    await mgr.removeKey("openai");
    assert.ok(!mgr.hasKey("openai"));

    const key = await mgr.getKey("openai");
    assert.equal(key, undefined);
  });

  test("updateKey replaces existing key", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await mgr.addKey("openai", "sk-old-key-1234");
    await mgr.updateKey("openai", "sk-new-key-5678");

    const key = await mgr.getKey("openai");
    assert.equal(key, "sk-new-key-5678");

    const entries = mgr.listKeys();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].maskedKey, "sk-n...5678");
  });

  test("listKeys returns all providers", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await mgr.addKey("openai", "sk-openai-test");
    await mgr.addKey("anthropic", "sk-ant-test1234");

    const entries = mgr.listKeys();
    assert.equal(entries.length, 2);
    const ids = entries.map((e) => e.providerId);
    assert.ok(ids.includes("openai"));
    assert.ok(ids.includes("anthropic"));
  });

  test("checkHealth with healthy provider", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await mgr.addKey("openai", "sk-test");

    const status = await mgr.checkHealth("openai");
    assert.ok(status.healthy);
    assert.equal(status.providerId, "openai");
    assert.ok(status.checkedAt > 0);
  });

  test("checkHealth with unhealthy provider", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createUnhealthyHealthCheck());
    await mgr.addKey("openai", "sk-test");

    const status = await mgr.checkHealth("openai");
    assert.ok(!status.healthy);
    assert.equal(status.detail, "Connection refused");
  });

  test("checkHealth with erroring health check", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createErrorHealthCheck());
    await mgr.addKey("openai", "sk-test");

    const status = await mgr.checkHealth("openai");
    assert.ok(!status.healthy);
    assert.ok(status.detail.includes("Network timeout"));
  });

  test("checkHealth without configured key", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());

    const status = await mgr.checkHealth("openai");
    assert.ok(!status.healthy);
    assert.ok(status.detail.includes("No API key"));
  });

  test("checkHealth without health check function", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);
    await mgr.addKey("openai", "sk-test");

    const status = await mgr.checkHealth("openai");
    assert.ok(!status.healthy);
    assert.ok(status.detail.includes("No health check"));
  });

  test("checkAllHealth returns status for all providers", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await mgr.addKey("openai", "sk-test1");
    await mgr.addKey("anthropic", "sk-test2");

    const results = await mgr.checkAllHealth();
    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.healthy));
  });

  test("loadMetadata restores persisted state", async () => {
    const secrets = createMockSecretStorage();
    const mgr1 = new ProviderKeyManager(secrets);
    await mgr1.addKey("openai", "sk-test");

    // Create new manager and load metadata
    const mgr2 = new ProviderKeyManager(secrets);
    assert.ok(!mgr2.hasKey("openai"));
    await mgr2.loadMetadata();
    assert.ok(mgr2.hasKey("openai"));
    assert.equal(mgr2.listKeys().length, 1);
  });

  test("loadMetadata handles corrupted data", async () => {
    const secrets = createMockSecretStorage();
    await secrets.store("prmpt.provider.metadata", "not valid json{{{");

    const mgr = new ProviderKeyManager(secrets);
    await mgr.loadMetadata();
    assert.equal(mgr.listKeys().length, 0);
  });

  test("maskApiKey handles short keys", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    const entry = await mgr.addKey("ollama", "short");
    assert.equal(entry.maskedKey, "***");
  });

  test("health check updates metadata", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await mgr.addKey("openai", "sk-test1234");

    // Before health check
    const before = mgr.listKeys().find((e) => e.providerId === "openai");
    assert.equal(before.healthy, undefined);
    assert.equal(before.lastVerified, undefined);

    await mgr.checkHealth("openai");

    // After health check
    const after = mgr.listKeys().find((e) => e.providerId === "openai");
    assert.equal(after.healthy, true);
    assert.ok(after.lastVerified > 0);
  });
});

// --- ProviderModeManager ---

describe("ProviderModeManager", () => {
  test("default mode is byok", () => {
    const mgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });
    assert.equal(mgr.getMode(), "byok");
  });

  test("switch to byok always succeeds", async () => {
    const mgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const result = await mgr.switchMode("byok");
    assert.ok(result.success);
    assert.equal(mgr.getMode(), "byok");
  });

  test("switch to local requires premium", async () => {
    const mgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const result = await mgr.switchMode("local");
    assert.ok(!result.success);
    assert.ok(result.error.includes("premium"));
    assert.equal(mgr.getMode(), "byok"); // unchanged
  });

  test("switch to local succeeds with premium", async () => {
    const mgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "premium" })
    });

    const result = await mgr.switchMode("local");
    assert.ok(result.success);
    assert.equal(mgr.getMode(), "local");
  });

  test("switch to local handles entitlement error", async () => {
    const mgr = new ProviderModeManager({
      checkEntitlement: async () => {
        throw new Error("Network error");
      }
    });

    const result = await mgr.switchMode("local");
    assert.ok(!result.success);
    assert.ok(result.error.includes("verify entitlement"));
  });
});

// --- Message handler integration ---

describe("Settings message handlers", () => {
  test("settings get handler returns mode and providers", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets);
    await keyMgr.addKey("openai", "sk-test1234");

    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const handler = createSettingsGetHandler(keyMgr, modeMgr);
    const req = createRequest(MESSAGE_TYPES.SETTINGS_GET_REQUEST, {});
    const resp = await handler(req);

    assert.equal(resp.type, MESSAGE_TYPES.SETTINGS_GET_RESPONSE);
    assert.equal(resp.payload.mode, "byok");
    assert.equal(resp.payload.providers.length, 1);
    assert.equal(resp.payload.providers[0].providerId, "openai");
  });

  test("settings update handler adds key", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets);
    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const handler = createSettingsUpdateHandler(keyMgr, modeMgr);
    const req = createRequest(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, {
      action: "add-key",
      providerId: "anthropic",
      apiKey: "sk-ant-secret123"
    });
    const resp = await handler(req);

    assert.ok(resp.payload.success);
    assert.equal(resp.payload.action, "add-key");
    assert.ok(keyMgr.hasKey("anthropic"));
  });

  test("settings update handler removes key", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets);
    await keyMgr.addKey("openai", "sk-test");

    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const handler = createSettingsUpdateHandler(keyMgr, modeMgr);
    const req = createRequest(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, {
      action: "remove-key",
      providerId: "openai"
    });
    const resp = await handler(req);

    assert.ok(resp.payload.success);
    assert.ok(!keyMgr.hasKey("openai"));
  });

  test("settings update handler switches mode", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets);
    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "premium" })
    });

    const handler = createSettingsUpdateHandler(keyMgr, modeMgr);
    const req = createRequest(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, {
      action: "switch-mode",
      mode: "local"
    });
    const resp = await handler(req);

    assert.ok(resp.payload.success);
    assert.equal(modeMgr.getMode(), "local");
  });

  test("settings update handler rejects free user local mode", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets);
    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const handler = createSettingsUpdateHandler(keyMgr, modeMgr);
    const req = createRequest(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, {
      action: "switch-mode",
      mode: "local"
    });
    const resp = await handler(req);

    assert.ok(!resp.payload.success);
    assert.ok(resp.payload.error.includes("premium"));
  });

  test("settings update handler rejects unknown action", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets);
    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const handler = createSettingsUpdateHandler(keyMgr, modeMgr);
    const req = createRequest(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, {
      action: "unknown-action"
    });
    const resp = await handler(req);

    assert.ok(!resp.payload.success);
    assert.ok(resp.payload.error.includes("Unknown"));
  });

  test("provider status handler returns health for one provider", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await keyMgr.addKey("openai", "sk-test");

    const handler = createProviderStatusHandler(keyMgr);
    const req = createRequest(MESSAGE_TYPES.PROVIDER_STATUS_REQUEST, {
      providerId: "openai"
    });
    const resp = await handler(req);

    assert.equal(resp.type, MESSAGE_TYPES.PROVIDER_STATUS_RESPONSE);
    assert.equal(resp.payload.providers.length, 1);
    assert.ok(resp.payload.providers[0].healthy);
  });

  test("provider status handler returns health for all providers", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await keyMgr.addKey("openai", "sk-test1");
    await keyMgr.addKey("anthropic", "sk-test2");

    const handler = createProviderStatusHandler(keyMgr);
    const req = createRequest(MESSAGE_TYPES.PROVIDER_STATUS_REQUEST, {});
    const resp = await handler(req);

    assert.equal(resp.payload.providers.length, 2);
  });

  test("full router integration with settings handlers", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "premium" })
    });

    const router = new HostMessageRouter();
    router.register(MESSAGE_TYPES.SETTINGS_GET_REQUEST, createSettingsGetHandler(keyMgr, modeMgr));
    router.register(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, createSettingsUpdateHandler(keyMgr, modeMgr));
    router.register(MESSAGE_TYPES.PROVIDER_STATUS_REQUEST, createProviderStatusHandler(keyMgr));

    // Add a key
    const addReq = createRequest(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, {
      action: "add-key",
      providerId: "openai",
      apiKey: "sk-test-key-1234"
    });
    const addResp = await router.dispatch(addReq);
    assert.ok(addResp.payload.success);

    // Get settings
    const getReq = createRequest(MESSAGE_TYPES.SETTINGS_GET_REQUEST, {});
    const getResp = await router.dispatch(getReq);
    assert.equal(getResp.payload.providers.length, 1);

    // Check health
    const healthReq = createRequest(MESSAGE_TYPES.PROVIDER_STATUS_REQUEST, {
      providerId: "openai"
    });
    const healthResp = await router.dispatch(healthReq);
    assert.ok(healthResp.payload.providers[0].healthy);
  });
});
