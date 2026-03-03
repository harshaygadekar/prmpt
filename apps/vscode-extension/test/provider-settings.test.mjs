import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ProviderKeyManager,
  ProviderModeManager,
  createSettingsGetHandler,
  createSettingsUpdateHandler,
  createProviderStatusHandler,
  validateKeyFormat
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

// --- Test key constants (valid formats for each provider) ---
const OPENAI_KEY_1 = "sk-abcdefghij1234567890abcdef";
const OPENAI_KEY_2 = "sk-zyxwvutsrq0987654321zyxwvu";
const ANTHROPIC_KEY_1 = "sk-ant-abcdefghij1234567890abcdef";
const ANTHROPIC_KEY_2 = "sk-ant-zyxwvutsrq0987654321zyxwvu";

// --- ProviderKeyManager ---

describe("ProviderKeyManager", () => {
  test("addKey stores and masks key", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    const entry = await mgr.addKey("openai", OPENAI_KEY_1);
    assert.equal(entry.providerId, "openai");
    assert.equal(entry.maskedKey, "sk-a...cdef");
    assert.ok(entry.addedAt > 0);
    assert.equal(entry.lastVerified, undefined);
    assert.equal(entry.healthy, undefined);
  });

  test("getKey retrieves stored key", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await mgr.addKey("anthropic", ANTHROPIC_KEY_1);
    const key = await mgr.getKey("anthropic");
    assert.equal(key, ANTHROPIC_KEY_1);
  });

  test("hasKey checks existence", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    assert.ok(!mgr.hasKey("openai"));
    await mgr.addKey("openai", OPENAI_KEY_1);
    assert.ok(mgr.hasKey("openai"));
  });

  test("removeKey deletes key and metadata", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await mgr.addKey("openai", OPENAI_KEY_1);
    assert.ok(mgr.hasKey("openai"));

    await mgr.removeKey("openai");
    assert.ok(!mgr.hasKey("openai"));

    const key = await mgr.getKey("openai");
    assert.equal(key, undefined);
  });

  test("updateKey replaces existing key", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await mgr.addKey("openai", OPENAI_KEY_1);
    await mgr.updateKey("openai", OPENAI_KEY_2);

    const key = await mgr.getKey("openai");
    assert.equal(key, OPENAI_KEY_2);

    const entries = mgr.listKeys();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].maskedKey, "sk-z...xwvu");
  });

  test("listKeys returns all providers", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await mgr.addKey("openai", OPENAI_KEY_1);
    await mgr.addKey("anthropic", ANTHROPIC_KEY_1);

    const entries = mgr.listKeys();
    assert.equal(entries.length, 2);
    const ids = entries.map((e) => e.providerId);
    assert.ok(ids.includes("openai"));
    assert.ok(ids.includes("anthropic"));
  });

  test("checkHealth with healthy provider", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await mgr.addKey("openai", OPENAI_KEY_1);

    const status = await mgr.checkHealth("openai");
    assert.ok(status.healthy);
    assert.equal(status.providerId, "openai");
    assert.ok(status.checkedAt > 0);
  });

  test("checkHealth with unhealthy provider", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createUnhealthyHealthCheck());
    await mgr.addKey("openai", OPENAI_KEY_1);

    const status = await mgr.checkHealth("openai");
    assert.ok(!status.healthy);
    assert.equal(status.detail, "Connection refused");
  });

  test("checkHealth with erroring health check", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createErrorHealthCheck());
    await mgr.addKey("openai", OPENAI_KEY_1);

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
    await mgr.addKey("openai", OPENAI_KEY_1);

    const status = await mgr.checkHealth("openai");
    assert.ok(!status.healthy);
    assert.ok(status.detail.includes("No health check"));
  });

  test("checkAllHealth returns status for all providers", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await mgr.addKey("openai", OPENAI_KEY_1);
    await mgr.addKey("anthropic", ANTHROPIC_KEY_1);

    const results = await mgr.checkAllHealth();
    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.healthy));
  });

  test("loadMetadata restores persisted state", async () => {
    const secrets = createMockSecretStorage();
    const mgr1 = new ProviderKeyManager(secrets);
    await mgr1.addKey("openai", OPENAI_KEY_1);

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

    const entry = await mgr.addKey("ollama", "short", { validate: false });
    assert.equal(entry.maskedKey, "***");
  });

  test("health check updates metadata", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await mgr.addKey("openai", OPENAI_KEY_1);

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
    await keyMgr.addKey("openai", OPENAI_KEY_1);

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
      apiKey: ANTHROPIC_KEY_1
    });
    const resp = await handler(req);

    assert.ok(resp.payload.success);
    assert.equal(resp.payload.action, "add-key");
    assert.ok(keyMgr.hasKey("anthropic"));
  });

  test("settings update handler removes key", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets);
    await keyMgr.addKey("openai", OPENAI_KEY_1);

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
    await keyMgr.addKey("openai", OPENAI_KEY_1);

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
    await keyMgr.addKey("openai", OPENAI_KEY_1);
    await keyMgr.addKey("anthropic", ANTHROPIC_KEY_1);

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
      apiKey: OPENAI_KEY_1
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

// --- ST-08-02: Key format validation ---

describe("validateKeyFormat", () => {
  test("rejects empty key", () => {
    const r = validateKeyFormat("openai", "");
    assert.ok(!r.valid);
    assert.ok(r.reason.includes("empty"));
  });

  test("rejects whitespace-only key", () => {
    const r = validateKeyFormat("openai", "   ");
    assert.ok(!r.valid);
    assert.ok(r.reason.includes("empty"));
  });

  test("rejects key with leading/trailing whitespace", () => {
    const r = validateKeyFormat("openai", " sk-abcdefghij1234567890abcdef ");
    assert.ok(!r.valid);
    assert.ok(r.reason.includes("whitespace"));
  });

  test("rejects key shorter than minimum", () => {
    const r = validateKeyFormat("openai", "short");
    assert.ok(!r.valid);
    assert.ok(r.reason.includes("8 characters"));
  });

  test("rejects OpenAI key with wrong prefix", () => {
    const r = validateKeyFormat("openai", "wrong-prefix-thatis-long-enough-1234567890");
    assert.ok(!r.valid);
    assert.ok(r.reason.includes("format"));
  });

  test("accepts valid OpenAI key", () => {
    const r = validateKeyFormat("openai", "sk-abcdefghij1234567890abcdef");
    assert.ok(r.valid);
  });

  test("accepts valid Anthropic key", () => {
    const r = validateKeyFormat("anthropic", "sk-ant-abcdefghij1234567890abcdef");
    assert.ok(r.valid);
  });

  test("rejects Anthropic key with wrong prefix", () => {
    const r = validateKeyFormat("anthropic", "sk-abcdefghij1234567890abcdef");
    assert.ok(!r.valid);
  });

  test("accepts valid Groq key", () => {
    const r = validateKeyFormat("groq", "gsk_abcdefghij1234567890abcdef");
    assert.ok(r.valid);
  });

  test("accepts valid Gemini key", () => {
    const r = validateKeyFormat("gemini", "AIzaSyA1234567890abcdefghijklmnopqrstuvwx");
    assert.ok(r.valid);
  });

  test("accepts any long key for providers without patterns (openrouter)", () => {
    const r = validateKeyFormat("openrouter", "some-long-key-that-is-valid-1234");
    assert.ok(r.valid);
  });

  test("accepts any long key for ollama (no pattern)", () => {
    const r = validateKeyFormat("ollama", "ollama-local-key-whatever");
    assert.ok(r.valid);
  });
});

// --- ST-08-02: addKey with validation ---

describe("ProviderKeyManager validation on addKey", () => {
  test("addKey rejects empty key by default", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await assert.rejects(
      () => mgr.addKey("openai", ""),
      (err) => err.message.includes("empty")
    );
  });

  test("addKey rejects malformed OpenAI key", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    await assert.rejects(
      () => mgr.addKey("openai", "bad-format-key-1234567890abcdef"),
      (err) => err.message.includes("format")
    );
  });

  test("addKey with validate=false skips validation", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    // Should NOT throw even with bad key
    const entry = await mgr.addKey("openai", "short", { validate: false });
    assert.equal(entry.providerId, "openai");
  });
});

// --- ST-08-02: rotateKey ---

describe("ProviderKeyManager rotateKey", () => {
  test("rotateKey replaces key when new key is healthy", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await mgr.addKey("openrouter", "old-key-that-is-long-enough-1234");

    const entry = await mgr.rotateKey("openrouter", "new-key-that-is-long-enough-5678");
    assert.equal(entry.providerId, "openrouter");

    const stored = await mgr.getKey("openrouter");
    assert.equal(stored, "new-key-that-is-long-enough-5678");
  });

  test("rotateKey aborts when new key fails health check", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createUnhealthyHealthCheck());
    await mgr.addKey("openrouter", "old-key-that-is-long-enough-1234", { validate: false });

    await assert.rejects(
      () => mgr.rotateKey("openrouter", "new-key-that-is-long-enough-5678"),
      (err) => err.message.includes("not healthy")
    );

    // Old key preserved
    const stored = await mgr.getKey("openrouter");
    assert.equal(stored, "old-key-that-is-long-enough-1234");
  });

  test("rotateKey aborts when health check throws", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createErrorHealthCheck());
    await mgr.addKey("openrouter", "old-key-that-is-long-enough-1234", { validate: false });

    await assert.rejects(
      () => mgr.rotateKey("openrouter", "new-key-that-is-long-enough-5678"),
      (err) => err.message.includes("health check failed")
    );

    // Old key preserved
    const stored = await mgr.getKey("openrouter");
    assert.equal(stored, "old-key-that-is-long-enough-1234");
  });

  test("rotateKey works without health check (just replaces)", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets); // no healthCheck
    await mgr.addKey("openrouter", "old-key-that-is-long-enough-1234", { validate: false });

    const entry = await mgr.rotateKey("openrouter", "new-key-that-is-long-enough-5678");
    assert.equal(entry.providerId, "openrouter");

    const stored = await mgr.getKey("openrouter");
    assert.equal(stored, "new-key-that-is-long-enough-5678");
  });

  test("rotateKey rejects malformed new key", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await mgr.addKey("openrouter", "old-key-that-is-long-enough-1234", { validate: false });

    await assert.rejects(
      () => mgr.rotateKey("openrouter", "   "),
      (err) => err.message.includes("empty")
    );
  });
});

// --- ST-08-02: auditKeys ---

describe("ProviderKeyManager auditKeys", () => {
  test("healthy audit when all keys present", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);
    await mgr.addKey("openrouter", "good-key-that-is-long-enough-1234", { validate: false });

    const audit = await mgr.auditKeys();
    assert.ok(audit.healthy);
    assert.equal(audit.missingSecrets.length, 0);
    assert.equal(audit.orphanedMetadata.length, 0);
  });

  test("detects missing secret (metadata exists, secret deleted)", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);
    await mgr.addKey("openrouter", "good-key-that-is-long-enough-1234", { validate: false });

    // Manually delete the secret but leave metadata
    await secrets.delete("prmpt.provider.key.openrouter");

    const audit = await mgr.auditKeys();
    assert.ok(!audit.healthy);
    assert.ok(audit.missingSecrets.includes("openrouter"));
  });

  test("healthy audit with no keys", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);

    const audit = await mgr.auditKeys();
    assert.ok(audit.healthy);
  });
});

// --- ST-08-02: assertNoLeaks ---

describe("ProviderKeyManager assertNoLeaks", () => {
  test("no leaks when keys are properly masked", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);
    await mgr.addKey("openrouter", "my-super-secret-long-api-key-12345", { validate: false });

    const result = await mgr.assertNoLeaks();
    assert.ok(result.safe);
    assert.equal(result.leaked.length, 0);
  });

  test("listKeys does not expose raw keys", async () => {
    const secrets = createMockSecretStorage();
    const mgr = new ProviderKeyManager(secrets);
    await mgr.addKey("openrouter", "sk-abcdefghij1234567890abcdef", { validate: false });

    const keys = mgr.listKeys();
    const serialized = JSON.stringify(keys);
    assert.ok(!serialized.includes("sk-abcdefghij1234567890abcdef"));
    assert.ok(serialized.includes("sk-a...cdef")); // masked
  });
});

// --- ST-08-02: rotate-key message handler ---

describe("Settings rotate-key message handler", () => {
  test("rotate-key action succeeds with healthy check", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets, createHealthyHealthCheck());
    await keyMgr.addKey("openrouter", "old-key-that-is-long-enough-1234", { validate: false });

    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const handler = createSettingsUpdateHandler(keyMgr, modeMgr);
    const req = createRequest(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, {
      action: "rotate-key",
      providerId: "openrouter",
      apiKey: "new-key-that-is-long-enough-5678"
    });
    const resp = await handler(req);

    assert.ok(resp.payload.success);
    assert.equal(resp.payload.action, "rotate-key");
  });

  test("rotate-key action fails with unhealthy check", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets, createUnhealthyHealthCheck());
    await keyMgr.addKey("openrouter", "old-key-that-is-long-enough-1234", { validate: false });

    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const handler = createSettingsUpdateHandler(keyMgr, modeMgr);
    const req = createRequest(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, {
      action: "rotate-key",
      providerId: "openrouter",
      apiKey: "new-key-that-is-long-enough-5678"
    });
    const resp = await handler(req);

    assert.ok(!resp.payload.success);
    assert.ok(resp.payload.error.includes("not healthy"));
  });

  test("add-key action now validates format by default", async () => {
    const secrets = createMockSecretStorage();
    const keyMgr = new ProviderKeyManager(secrets);

    const modeMgr = new ProviderModeManager({
      checkEntitlement: async () => ({ tier: "free" })
    });

    const handler = createSettingsUpdateHandler(keyMgr, modeMgr);
    const req = createRequest(MESSAGE_TYPES.SETTINGS_UPDATE_REQUEST, {
      action: "add-key",
      providerId: "openai",
      apiKey: "bad"
    });
    const resp = await handler(req);

    assert.ok(!resp.payload.success);
    assert.ok(resp.payload.error.includes("8 characters"));
  });
});
