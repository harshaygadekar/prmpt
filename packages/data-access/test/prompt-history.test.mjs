import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryPromptHistoryRepository,
  MAX_HISTORY_ENTRIES
} from "../dist/index.js";

function createRepo(now) {
  return new InMemoryPromptHistoryRepository(now ?? (() => new Date("2026-03-03T00:00:00Z")));
}

function makeRecord(userId, overrides = {}) {
  return {
    id: "",
    userId,
    inputPrompt: "test prompt",
    optimizedPrompt: "optimized prompt",
    modelFamily: "gpt",
    outputFormat: "markdown",
    provider: "openai",
    score: 75,
    templateId: undefined,
    createdAt: "",
    metadata: undefined,
    ...overrides
  };
}

describe("InMemoryPromptHistoryRepository", () => {
  it("adds and retrieves entry", async () => {
    const repo = createRepo();
    const entry = await repo.add(makeRecord("user1"));
    assert.ok(entry.id.length > 0);
    const fetched = await repo.getById("user1", entry.id);
    assert.equal(fetched?.inputPrompt, "test prompt");
  });

  it("returns undefined for wrong user", async () => {
    const repo = createRepo();
    const entry = await repo.add(makeRecord("user1"));
    const fetched = await repo.getById("user2", entry.id);
    assert.equal(fetched, undefined);
  });

  it("lists entries for user in reverse chronological order", async () => {
    let time = 1000;
    const repo = createRepo(() => new Date(time++));
    await repo.add(makeRecord("user1", { inputPrompt: "first" }));
    await repo.add(makeRecord("user1", { inputPrompt: "second" }));
    await repo.add(makeRecord("user2", { inputPrompt: "other" }));

    const { entries, total } = await repo.list("user1");
    assert.equal(total, 2);
    assert.equal(entries[0].inputPrompt, "second");
    assert.equal(entries[1].inputPrompt, "first");
  });

  it("supports search filtering", async () => {
    const repo = createRepo();
    await repo.add(makeRecord("user1", { inputPrompt: "debug my code" }));
    await repo.add(makeRecord("user1", { inputPrompt: "write a test" }));

    const { entries } = await repo.list("user1", { search: "debug" });
    assert.equal(entries.length, 1);
    assert.ok(entries[0].inputPrompt.includes("debug"));
  });

  it("supports limit and offset", async () => {
    let time = 1000;
    const repo = createRepo(() => new Date(time++));
    for (let i = 0; i < 5; i++) {
      await repo.add(makeRecord("user1", { inputPrompt: `prompt ${i}` }));
    }

    const { entries, total } = await repo.list("user1", { limit: 2, offset: 1 });
    assert.equal(total, 5);
    assert.equal(entries.length, 2);
  });

  it("removes entry by user and id", async () => {
    const repo = createRepo();
    const entry = await repo.add(makeRecord("user1"));
    assert.ok(await repo.remove("user1", entry.id));
    assert.equal(await repo.getById("user1", entry.id), undefined);
  });

  it("remove returns false for wrong user", async () => {
    const repo = createRepo();
    const entry = await repo.add(makeRecord("user1"));
    assert.equal(await repo.remove("user2", entry.id), false);
  });

  it("counts entries by user", async () => {
    const repo = createRepo();
    await repo.add(makeRecord("user1"));
    await repo.add(makeRecord("user1"));
    await repo.add(makeRecord("user2"));
    assert.equal(await repo.countByUser("user1"), 2);
    assert.equal(await repo.countByUser("user2"), 1);
  });

  it("clears all entries for a user", async () => {
    const repo = createRepo();
    await repo.add(makeRecord("user1"));
    await repo.add(makeRecord("user1"));
    await repo.add(makeRecord("user2"));
    const deleted = await repo.clear("user1");
    assert.equal(deleted, 2);
    assert.equal(await repo.countByUser("user1"), 0);
    assert.equal(await repo.countByUser("user2"), 1);
  });

  it("enforces MAX_HISTORY_ENTRIES per user by evicting oldest", async () => {
    let time = 1000;
    const repo = createRepo(() => new Date(time++));
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
      await repo.add(makeRecord("user1", { inputPrompt: `prompt ${i}` }));
    }

    const count = await repo.countByUser("user1");
    assert.ok(count <= MAX_HISTORY_ENTRIES);
  });
});
