import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HistoryManager,
  createHistoryClient,
  createHistoryListHandler,
  createHistoryGetHandler,
  createHistoryDeleteHandler,
  HISTORY_MESSAGE_TYPES
} from "../dist/history/index.js";
import { createRequest } from "../dist/messaging/index.js";

// --- Mock client ---
function createMockClient(overrides = {}) {
  return {
    list: async () => ({ entries: [{ id: "h1", inputPrompt: "test", optimizedPrompt: "opt", modelFamily: "gpt", outputFormat: "markdown", provider: "openai", score: 80, templateId: undefined, createdAt: "2026-01-01T00:00:00Z" }], total: 1 }),
    get: async (_uid, id) => id === "h1" ? { id: "h1", inputPrompt: "test", optimizedPrompt: "opt", modelFamily: "gpt", outputFormat: "markdown", provider: "openai", score: 80, templateId: undefined, createdAt: "2026-01-01T00:00:00Z" } : undefined,
    remove: async () => true,
    ...overrides
  };
}

function noop() {}
async function noopWarning() { return undefined; }
function createManager(client, entitlement = { isPremium: true }) {
  return new HistoryManager({
    client,
    checkEntitlement: async () => entitlement,
    showInfo: noop,
    showWarning: noopWarning,
    showError: noop
  });
}

describe("HistoryManager", () => {
  it("lists history for premium user", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const result = await manager.list("user1");
    assert.ok(result);
    assert.equal(result.total, 1);
    assert.equal(result.entries[0].id, "h1");
  });

  it("blocks list for free user", async () => {
    const client = createMockClient();
    const manager = createManager(client, { isPremium: false });
    const result = await manager.list("user1");
    assert.equal(result, undefined);
  });

  it("gets history entry for premium user", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const entry = await manager.get("user1", "h1");
    assert.ok(entry);
    assert.equal(entry.id, "h1");
  });

  it("returns undefined for missing entry", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const entry = await manager.get("user1", "nonexistent");
    assert.equal(entry, undefined);
  });

  it("removes history entry for premium user", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const removed = await manager.remove("user1", "h1");
    assert.ok(removed);
  });

  it("blocks remove for free user", async () => {
    const client = createMockClient();
    const manager = createManager(client, { isPremium: false });
    const removed = await manager.remove("user1", "h1");
    assert.equal(removed, false);
  });

  it("handles client error in list gracefully", async () => {
    const client = createMockClient({ list: async () => { throw new Error("network"); } });
    const manager = createManager(client);
    const result = await manager.list("user1");
    assert.equal(result, undefined);
  });

  it("caches last list result", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    await manager.list("user1");
    const cached = manager.getCachedList();
    assert.ok(cached);
    assert.equal(cached.total, 1);
  });
});

describe("History message handlers", () => {
  it("list handler returns entries for signed-in premium user", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const handler = createHistoryListHandler(manager, () => "user1");
    const env = createRequest(HISTORY_MESSAGE_TYPES.HISTORY_LIST_REQUEST, {});
    const res = await handler(env);
    assert.equal(res.payload.success, true);
    assert.equal(res.payload.total, 1);
  });

  it("list handler returns error if not signed in", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const handler = createHistoryListHandler(manager, () => undefined);
    const env = createRequest(HISTORY_MESSAGE_TYPES.HISTORY_LIST_REQUEST, {});
    const res = await handler(env);
    assert.equal(res.payload.success, false);
    assert.ok(res.payload.error.includes("Not signed in"));
  });

  it("get handler returns entry", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const handler = createHistoryGetHandler(manager, () => "user1");
    const env = createRequest(HISTORY_MESSAGE_TYPES.HISTORY_GET_REQUEST, { entryId: "h1" });
    const res = await handler(env);
    assert.equal(res.payload.success, true);
    assert.equal(res.payload.entry.id, "h1");
  });

  it("get handler requires entryId", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const handler = createHistoryGetHandler(manager, () => "user1");
    const env = createRequest(HISTORY_MESSAGE_TYPES.HISTORY_GET_REQUEST, {});
    const res = await handler(env);
    assert.equal(res.payload.success, false);
  });

  it("delete handler removes entry", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const handler = createHistoryDeleteHandler(manager, () => "user1");
    const env = createRequest(HISTORY_MESSAGE_TYPES.HISTORY_DELETE_REQUEST, { entryId: "h1" });
    const res = await handler(env);
    assert.equal(res.payload.success, true);
  });

  it("delete handler requires entryId", async () => {
    const client = createMockClient();
    const manager = createManager(client);
    const handler = createHistoryDeleteHandler(manager, () => "user1");
    const env = createRequest(HISTORY_MESSAGE_TYPES.HISTORY_DELETE_REQUEST, {});
    const res = await handler(env);
    assert.equal(res.payload.success, false);
  });
});
