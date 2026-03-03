import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createTemplateCreateApi,
  createTemplateGetApi,
  createTemplateListApi,
  createTemplateUpdateApi,
  createTemplateDeleteApi
} from "../dist/api/template-crud.js";
import { InMemoryTemplateRepository } from "@prmpt/data-access";

function makeRepo() {
  return new InMemoryTemplateRepository();
}

function validCreateBody(overrides = {}) {
  return {
    userId: "user-001",
    title: "My Template",
    category: "debug",
    description: "Debug helper template.",
    modelFamilies: ["claude"],
    promptBody: "Debug: {{code_snippet}}",
    variables: [
      { key: "code_snippet", type: "code", required: true, description: "Code to debug" }
    ],
    tags: ["debug"],
    ...overrides
  };
}

function seedBuiltin(repo) {
  repo.seed([
    {
      id: "tpl-builtin-001",
      schemaVersion: "1.0",
      title: "Built-in Debug",
      category: "debug",
      description: "System debug template.",
      tier: "starter_free",
      ownership: "builtin",
      modelFamilies: ["claude", "gpt"],
      promptBody: "Debug: {{code}}",
      variables: [{ key: "code", type: "code", required: true, description: "Code" }],
      tags: ["debug"],
      suggestedTechniques: [],
      createdBy: "system",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "tpl-builtin-premium",
      schemaVersion: "1.0",
      title: "Premium Review",
      category: "review",
      description: "Premium code review template.",
      tier: "premium",
      ownership: "builtin",
      modelFamilies: ["claude"],
      promptBody: "Review: {{code}}",
      variables: [{ key: "code", type: "code", required: true, description: "Code" }],
      tags: ["review"],
      suggestedTechniques: [],
      createdBy: "system",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ]);
}

// --- Create ---

describe("Template Create API", () => {
  test("creates user template successfully", async () => {
    const repo = makeRepo();
    const handler = createTemplateCreateApi({
      templateRepository: repo,
      getEntitlement: async () => ({ isPremium: false })
    });

    const res = await handler({ body: validCreateBody() });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.title, "My Template");
    assert.equal(res.body.ownership, "user");
    assert.equal(res.body.createdBy, "user-001");
  });

  test("rejects invalid request", async () => {
    const handler = createTemplateCreateApi({
      templateRepository: makeRepo(),
      getEntitlement: async () => ({ isPremium: false })
    });

    const res = await handler({ body: { userId: "" } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "invalid_request");
  });

  test("blocks free user beyond template limit", async () => {
    const repo = makeRepo();
    const handler = createTemplateCreateApi({
      templateRepository: repo,
      getEntitlement: async () => ({ isPremium: false })
    });

    // Create 5 templates
    for (let i = 0; i < 5; i++) {
      const res = await handler({ body: validCreateBody({ title: `Template ${i}` }) });
      assert.equal(res.status, 201);
    }

    // 6th should be blocked
    const res = await handler({ body: validCreateBody({ title: "Template 5" }) });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, "template_limit_reached");
  });

  test("premium user bypasses template limit", async () => {
    const repo = makeRepo();
    const handler = createTemplateCreateApi({
      templateRepository: repo,
      getEntitlement: async () => ({ isPremium: true })
    });

    for (let i = 0; i < 7; i++) {
      const res = await handler({ body: validCreateBody({ title: `Template ${i}` }) });
      assert.equal(res.status, 201);
    }
  });
});

// --- Get ---

describe("Template Get API", () => {
  test("gets builtin template", async () => {
    const repo = makeRepo();
    seedBuiltin(repo);
    const handler = createTemplateGetApi({
      templateRepository: repo,
      getEntitlement: async () => ({ isPremium: false })
    });

    const res = await handler({ body: { userId: "user-001", templateId: "tpl-builtin-001" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.id, "tpl-builtin-001");
    assert.equal(res.body.ownership, "builtin");
  });

  test("returns 404 for missing template", async () => {
    const handler = createTemplateGetApi({
      templateRepository: makeRepo(),
      getEntitlement: async () => ({ isPremium: false })
    });

    const res = await handler({ body: { userId: "user-001", templateId: "nonexistent" } });
    assert.equal(res.status, 404);
  });

  test("blocks free user from premium template", async () => {
    const repo = makeRepo();
    seedBuiltin(repo);
    const handler = createTemplateGetApi({
      templateRepository: repo,
      getEntitlement: async () => ({ isPremium: false })
    });

    const res = await handler({ body: { userId: "user-001", templateId: "tpl-builtin-premium" } });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, "premium_required");
  });

  test("premium user gets premium template", async () => {
    const repo = makeRepo();
    seedBuiltin(repo);
    const handler = createTemplateGetApi({
      templateRepository: repo,
      getEntitlement: async () => ({ isPremium: true })
    });

    const res = await handler({ body: { userId: "user-001", templateId: "tpl-builtin-premium" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.tier, "premium");
  });

  test("user cannot get another user's template", async () => {
    const repo = makeRepo();
    await repo.create({
      id: "tpl-private",
      schemaVersion: "1.0",
      title: "Private",
      category: "debug",
      description: "Private template.",
      tier: "starter_free",
      ownership: "user",
      modelFamilies: ["claude"],
      promptBody: "Debug",
      variables: [],
      tags: [],
      suggestedTechniques: [],
      createdBy: "user-002",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    const handler = createTemplateGetApi({
      templateRepository: repo,
      getEntitlement: async () => ({ isPremium: false })
    });

    const res = await handler({ body: { userId: "user-001", templateId: "tpl-private" } });
    assert.equal(res.status, 404);
  });
});

// --- List ---

describe("Template List API", () => {
  test("lists builtin + own templates", async () => {
    const repo = makeRepo();
    seedBuiltin(repo);
    await repo.create({
      id: "tpl-user-1",
      schemaVersion: "1.0",
      title: "My Debug",
      category: "debug",
      description: "User template.",
      tier: "starter_free",
      ownership: "user",
      modelFamilies: ["claude"],
      promptBody: "Debug",
      variables: [],
      tags: [],
      suggestedTechniques: [],
      createdBy: "user-001",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    const handler = createTemplateListApi({ templateRepository: repo });
    const res = await handler({ body: { userId: "user-001" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3); // 2 builtin + 1 user
  });

  test("filters by category", async () => {
    const repo = makeRepo();
    seedBuiltin(repo);
    const handler = createTemplateListApi({ templateRepository: repo });

    const res = await handler({ body: { userId: "user-001", category: "review" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.templates[0].category, "review");
  });

  test("filters by search term", async () => {
    const repo = makeRepo();
    seedBuiltin(repo);
    const handler = createTemplateListApi({ templateRepository: repo });

    const res = await handler({ body: { userId: "user-001", search: "premium" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
  });

  test("rejects missing userId", async () => {
    const handler = createTemplateListApi({ templateRepository: makeRepo() });
    const res = await handler({ body: {} });
    assert.equal(res.status, 400);
  });
});

// --- Update ---

describe("Template Update API", () => {
  test("updates user template", async () => {
    const repo = makeRepo();
    await repo.create({
      id: "tpl-user-1",
      schemaVersion: "1.0",
      title: "Original",
      category: "debug",
      description: "Desc.",
      tier: "starter_free",
      ownership: "user",
      modelFamilies: ["claude"],
      promptBody: "Debug",
      variables: [],
      tags: [],
      suggestedTechniques: [],
      createdBy: "user-001",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    const handler = createTemplateUpdateApi({ templateRepository: repo });
    const res = await handler({
      body: { userId: "user-001", templateId: "tpl-user-1", title: "Updated" }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, "Updated");
    assert.equal(res.body.id, "tpl-user-1");
  });

  test("rejects update of builtin template", async () => {
    const repo = makeRepo();
    seedBuiltin(repo);
    const handler = createTemplateUpdateApi({ templateRepository: repo });

    const res = await handler({
      body: { userId: "user-001", templateId: "tpl-builtin-001", title: "Hacked" }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, "builtin_immutable");
  });

  test("rejects update by non-owner", async () => {
    const repo = makeRepo();
    await repo.create({
      id: "tpl-user-1",
      schemaVersion: "1.0",
      title: "Original",
      category: "debug",
      description: "Desc.",
      tier: "starter_free",
      ownership: "user",
      modelFamilies: ["claude"],
      promptBody: "Debug",
      variables: [],
      tags: [],
      suggestedTechniques: [],
      createdBy: "user-001",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    const handler = createTemplateUpdateApi({ templateRepository: repo });
    const res = await handler({
      body: { userId: "user-999", templateId: "tpl-user-1", title: "Nope" }
    });
    assert.equal(res.status, 404);
  });

  test("returns 404 for nonexistent template", async () => {
    const handler = createTemplateUpdateApi({ templateRepository: makeRepo() });
    const res = await handler({
      body: { userId: "user-001", templateId: "nonexistent", title: "X" }
    });
    assert.equal(res.status, 404);
  });
});

// --- Delete ---

describe("Template Delete API", () => {
  test("deletes user template", async () => {
    const repo = makeRepo();
    await repo.create({
      id: "tpl-user-1",
      schemaVersion: "1.0",
      title: "Delete Me",
      category: "debug",
      description: "Desc.",
      tier: "starter_free",
      ownership: "user",
      modelFamilies: ["claude"],
      promptBody: "Debug",
      variables: [],
      tags: [],
      suggestedTechniques: [],
      createdBy: "user-001",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    const handler = createTemplateDeleteApi({ templateRepository: repo });
    const res = await handler({ body: { userId: "user-001", templateId: "tpl-user-1" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.deleted, true);

    // Verify gone
    const found = await repo.getById("tpl-user-1");
    assert.equal(found, undefined);
  });

  test("rejects deletion of builtin template", async () => {
    const repo = makeRepo();
    seedBuiltin(repo);
    const handler = createTemplateDeleteApi({ templateRepository: repo });

    const res = await handler({ body: { userId: "user-001", templateId: "tpl-builtin-001" } });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, "builtin_immutable");
  });

  test("rejects deletion by non-owner", async () => {
    const repo = makeRepo();
    await repo.create({
      id: "tpl-user-1",
      schemaVersion: "1.0",
      title: "Not Yours",
      category: "debug",
      description: "Desc.",
      tier: "starter_free",
      ownership: "user",
      modelFamilies: ["claude"],
      promptBody: "Debug",
      variables: [],
      tags: [],
      suggestedTechniques: [],
      createdBy: "user-002",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    const handler = createTemplateDeleteApi({ templateRepository: repo });
    const res = await handler({ body: { userId: "user-001", templateId: "tpl-user-1" } });
    assert.equal(res.status, 404);
  });

  test("returns 404 for missing template", async () => {
    const handler = createTemplateDeleteApi({ templateRepository: makeRepo() });
    const res = await handler({ body: { userId: "user-001", templateId: "nonexistent" } });
    assert.equal(res.status, 404);
  });
});
