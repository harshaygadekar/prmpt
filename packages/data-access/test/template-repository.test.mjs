import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryTemplateRepository } from "../dist/index.js";

function makeTemplate(overrides = {}) {
  return {
    id: "tpl-test-001",
    schemaVersion: "1.0",
    title: "Test Template",
    category: "debug",
    description: "A test template.",
    tier: "starter_free",
    ownership: "user",
    modelFamilies: ["claude"],
    promptBody: "Debug this: {{code_snippet}}",
    variables: [{ key: "code_snippet", type: "code", required: true, description: "Code" }],
    tags: ["debug", "test"],
    suggestedTechniques: ["step-decomposition"],
    createdBy: "user-001",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  };
}

describe("InMemoryTemplateRepository", () => {
  test("create stores and returns template", async () => {
    const repo = new InMemoryTemplateRepository();
    const created = await repo.create(makeTemplate());
    assert.equal(created.id, "tpl-test-001");
    assert.equal(created.title, "Test Template");
  });

  test("getById returns stored template", async () => {
    const repo = new InMemoryTemplateRepository();
    await repo.create(makeTemplate());
    const found = await repo.getById("tpl-test-001");
    assert.ok(found);
    assert.equal(found.id, "tpl-test-001");
  });

  test("getById returns undefined for missing", async () => {
    const repo = new InMemoryTemplateRepository();
    const found = await repo.getById("nonexistent");
    assert.equal(found, undefined);
  });

  test("listByUser shows builtin + own templates", async () => {
    const repo = new InMemoryTemplateRepository();
    await repo.create(makeTemplate({ id: "tpl-builtin-1", ownership: "builtin", createdBy: "system" }));
    await repo.create(makeTemplate({ id: "tpl-user-1", ownership: "user", createdBy: "user-001" }));
    await repo.create(makeTemplate({ id: "tpl-user-2", ownership: "user", createdBy: "user-002" }));

    const results = await repo.listByUser("user-001");
    const ids = results.map((t) => t.id);
    assert.ok(ids.includes("tpl-builtin-1"), "should include builtin");
    assert.ok(ids.includes("tpl-user-1"), "should include own template");
    assert.ok(!ids.includes("tpl-user-2"), "should exclude other user's template");
  });

  test("listByUser filters by category", async () => {
    const repo = new InMemoryTemplateRepository();
    await repo.create(makeTemplate({ id: "t1", category: "debug", ownership: "builtin", createdBy: "system" }));
    await repo.create(makeTemplate({ id: "t2", category: "refactor", ownership: "builtin", createdBy: "system" }));

    const results = await repo.listByUser("user-001", { category: "debug" });
    assert.equal(results.length, 1);
    assert.equal(results[0].category, "debug");
  });

  test("listByUser filters by modelFamily", async () => {
    const repo = new InMemoryTemplateRepository();
    await repo.create(makeTemplate({ id: "t1", modelFamilies: ["claude"], ownership: "builtin", createdBy: "system" }));
    await repo.create(makeTemplate({ id: "t2", modelFamilies: ["gpt"], ownership: "builtin", createdBy: "system" }));

    const results = await repo.listByUser("user-001", { modelFamily: "gpt" });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "t2");
  });

  test("listByUser filters by search term", async () => {
    const repo = new InMemoryTemplateRepository();
    await repo.create(makeTemplate({ id: "t1", title: "Code Review Helper", ownership: "builtin", createdBy: "system" }));
    await repo.create(makeTemplate({ id: "t2", title: "Debug Inspector", ownership: "builtin", createdBy: "system" }));

    const results = await repo.listByUser("user-001", { search: "review" });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "t1");
  });

  test("update modifies fields and returns updated template", async () => {
    const repo = new InMemoryTemplateRepository();
    await repo.create(makeTemplate());
    const updated = await repo.update("tpl-test-001", { title: "Updated Title", updatedAt: "2026-03-02T00:00:00.000Z" });
    assert.ok(updated);
    assert.equal(updated.title, "Updated Title");
    assert.equal(updated.id, "tpl-test-001"); // id preserved
  });

  test("update returns undefined for missing template", async () => {
    const repo = new InMemoryTemplateRepository();
    const result = await repo.update("nonexistent", { title: "Nope" });
    assert.equal(result, undefined);
  });

  test("delete removes template", async () => {
    const repo = new InMemoryTemplateRepository();
    await repo.create(makeTemplate());
    const deleted = await repo.delete("tpl-test-001");
    assert.equal(deleted, true);
    const found = await repo.getById("tpl-test-001");
    assert.equal(found, undefined);
  });

  test("delete returns false for missing template", async () => {
    const repo = new InMemoryTemplateRepository();
    const deleted = await repo.delete("nonexistent");
    assert.equal(deleted, false);
  });

  test("countByUser counts only user-owned templates", async () => {
    const repo = new InMemoryTemplateRepository();
    await repo.create(makeTemplate({ id: "t1", ownership: "builtin", createdBy: "system" }));
    await repo.create(makeTemplate({ id: "t2", ownership: "user", createdBy: "user-001" }));
    await repo.create(makeTemplate({ id: "t3", ownership: "user", createdBy: "user-001" }));
    await repo.create(makeTemplate({ id: "t4", ownership: "user", createdBy: "user-002" }));

    const count = await repo.countByUser("user-001");
    assert.equal(count, 2);
  });

  test("seed loads builtin templates", async () => {
    const repo = new InMemoryTemplateRepository();
    repo.seed([
      makeTemplate({ id: "tpl-builtin-1", ownership: "builtin", createdBy: "system" }),
      makeTemplate({ id: "tpl-builtin-2", ownership: "builtin", createdBy: "system" })
    ]);

    const found = await repo.getById("tpl-builtin-1");
    assert.ok(found);
    assert.equal(found.ownership, "builtin");

    const list = await repo.listByUser("any-user");
    assert.equal(list.length, 2);
  });
});
