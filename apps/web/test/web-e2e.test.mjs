/**
 * Web API E2E Tests (ST-09-02)
 *
 * High-level end-to-end tests exercising critical web API handler chains.
 * These test the full handler stack including validation, business logic,
 * and response shaping — not individual unit behaviors.
 *
 * Coverage:
 *   1. Bootstrap → usage consume → entitlement read flow
 *   2. Auth guard protects routes
 *   3. Template CRUD lifecycle
 *   4. Payment webhook idempotency
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createExtensionBootstrapApi } from "../dist/api/extension-bootstrap.js";
import { createUsageConsumeApi } from "../dist/api/usage-consume.js";
import { createEntitlementReadApi } from "../dist/api/entitlement-read.js";
import {
  createTemplateCreateApi,
  createTemplateGetApi,
  createTemplateListApi,
  createTemplateUpdateApi,
  createTemplateDeleteApi
} from "../dist/api/template-crud.js";
import { createPolarEntitlementProvider } from "../dist/entitlement/provider.js";
import { withAuthGuard, InMemoryReplayGuard } from "../dist/api/auth-guard.js";
import {
  InMemoryUserBootstrapRepository,
  InMemoryPaymentEventRepository,
  InMemoryTemplateRepository
} from "@prmpt/data-access";

// --- E2E: User Lifecycle ---

describe("Web E2E: Bootstrap → Usage → Entitlement Lifecycle", () => {
  it("full trial user lifecycle: bootstrap, consume sessions, check entitlement", async () => {
    const userRepo = new InMemoryUserBootstrapRepository();
    const eventRepo = new InMemoryPaymentEventRepository();

    // 1. Bootstrap user
    const bootstrap = createExtensionBootstrapApi({ userRepository: userRepo });
    const bootstrapRes = await bootstrap({
      body: { clerkUserId: "user_e2e_1", platform: "vscode" }
    });
    assert.equal(bootstrapRes.status, 200);
    assert.equal(bootstrapRes.body.isPremium, false);
    assert.equal(bootstrapRes.body.sessionLimit, 9);
    assert.equal(bootstrapRes.body.remainingSessions, 9);

    // 2. Consume sessions (8 of 9)
    const consume = createUsageConsumeApi({ userRepository: userRepo });
    for (let i = 0; i < 8; i++) {
      const res = await consume({ body: { userId: "user_e2e_1", sessionCount: 1 } });
      assert.equal(res.status, 200);
      assert.equal(res.body.remainingSessions, 9 - (i + 1));
    }

    // 3. Consume 9th session (last)
    const lastRes = await consume({ body: { userId: "user_e2e_1", sessionCount: 1 } });
    assert.equal(lastRes.status, 200);
    assert.equal(lastRes.body.remainingSessions, 0);

    // 4. Try to over-consume (should fail)
    const overRes = await consume({ body: { userId: "user_e2e_1", sessionCount: 1 } });
    assert.equal(overRes.status, 403);

    // 5. Read entitlement
    const entitlementProvider = createPolarEntitlementProvider({
      userRepository: userRepo,
      paymentEventRepository: eventRepo
    });
    const readApi = createEntitlementReadApi({ entitlementProvider });
    const entRes = await readApi({ query: { userId: "user_e2e_1" } });
    assert.equal(entRes.status, 200);
    assert.equal(entRes.body.isPremium, false);
  });

  it("premium user bypasses trial consumption limits", async () => {
    const userRepo = new InMemoryUserBootstrapRepository();

    // Bootstrap and set premium
    const bootstrap = createExtensionBootstrapApi({ userRepository: userRepo });
    await bootstrap({ body: { clerkUserId: "user_premium_1", platform: "vscode" } });
    await userRepo.setPremium("user_premium_1", true);

    // Consume should succeed beyond trial limit
    const consume = createUsageConsumeApi({ userRepository: userRepo });
    for (let i = 0; i < 15; i++) {
      const res = await consume({ body: { userId: "user_premium_1", sessionCount: 1 } });
      assert.equal(res.status, 200, `consumption ${i + 1} should succeed`);
    }
  });
});

// --- E2E: Auth Guard Integration ---

describe("Web E2E: Auth Guard Protects Routes", () => {
  it("guarded bootstrap rejects unauthenticated requests", async () => {
    const userRepo = new InMemoryUserBootstrapRepository();
    const bootstrap = createExtensionBootstrapApi({ userRepository: userRepo });

    const guarded = withAuthGuard(
      async (req, ctx) => bootstrap(req),
      {
        verifier: {
          async verify() { throw new (await import("../dist/api/auth-guard.js")).ApiAuthError("invalid_token", "bad"); }
        }
      }
    );

    const result = await guarded({
      headers: { authorization: "Bearer invalid" },
      body: { clerkUserId: "user_1", platform: "vscode" }
    });
    assert.equal(result.status, 401);
  });

  it("replay guard blocks duplicate request IDs", async () => {
    const guard = new InMemoryReplayGuard();
    const userRepo = new InMemoryUserBootstrapRepository();
    const bootstrap = createExtensionBootstrapApi({ userRepository: userRepo });

    const guarded = withAuthGuard(
      async (req, ctx) => bootstrap(req),
      {
        verifier: {
          async verify() { return { userId: "u1", scopes: ["admin"], tokenIssuedAt: 0 }; }
        },
        replayGuard: guard
      }
    );

    // First request
    const res1 = await guarded({
      headers: { authorization: "Bearer valid", "x-request-id": "req-e2e-1" },
      body: { clerkUserId: "user_1", platform: "vscode" }
    });
    assert.equal(res1.status, 200);

    // Replay
    const res2 = await guarded({
      headers: { authorization: "Bearer valid", "x-request-id": "req-e2e-1" },
      body: { clerkUserId: "user_1", platform: "vscode" }
    });
    assert.equal(res2.status, 409);
  });
});

// --- E2E: Template CRUD Lifecycle ---

describe("Web E2E: Template CRUD Lifecycle", () => {
  it("create, list, get, update, delete template", async () => {
    const templateRepo = new InMemoryTemplateRepository();
    const userRepo = new InMemoryUserBootstrapRepository();
    await userRepo.upsertUser("tpl_user_1");

    const create = createTemplateCreateApi({ templateRepository: templateRepo, userRepository: userRepo });
    const list = createTemplateListApi({ templateRepository: templateRepo });
    const get = createTemplateGetApi({ templateRepository: templateRepo, userRepository: userRepo });
    const update = createTemplateUpdateApi({ templateRepository: templateRepo });
    const del = createTemplateDeleteApi({ templateRepository: templateRepo });

    // Create
    const createRes = await create({
      body: {
        userId: "tpl_user_1",
        title: "E2E Test Template",
        description: "A debug template for E2E tests",
        category: "debug",
        promptBody: "Debug this: {{code}}",
        modelFamilies: ["gpt"],
        variables: [{ key: "code", type: "code", required: true, description: "Code to debug" }]
      }
    });
    assert.equal(createRes.status, 201);
    const templateId = createRes.body.id;
    assert.ok(templateId);

    // List
    const listRes = await list({ body: { userId: "tpl_user_1" } });
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.templates.length, 1);

    // Get
    const getRes = await get({ body: { templateId, userId: "tpl_user_1" } });
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.title, "E2E Test Template");

    // Update
    const updateRes = await update({
      body: { templateId, userId: "tpl_user_1", title: "Updated E2E Template" }
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.title, "Updated E2E Template");

    // Delete
    const deleteRes = await del({
      body: { templateId, userId: "tpl_user_1" }
    });
    assert.equal(deleteRes.status, 200);

    // Verify deleted
    const listAfter = await list({ body: { userId: "tpl_user_1" } });
    assert.equal(listAfter.body.templates.length, 0);
  });

  it("free user template limit enforced (5 max)", async () => {
    const templateRepo = new InMemoryTemplateRepository();
    const userRepo = new InMemoryUserBootstrapRepository();
    await userRepo.upsertUser("free_user_1");

    const create = createTemplateCreateApi({ templateRepository: templateRepo, userRepository: userRepo });

    // Create 5 templates
    for (let i = 0; i < 5; i++) {
      const res = await create({
        body: {
          userId: "free_user_1",
          title: `Template ${i}`,
          description: `Template ${i} description`,
          category: "debug",
          promptBody: `Debug {{code_${i}}}`,
          modelFamilies: ["gpt"],
          variables: [{ key: `code_${i}`, type: "code", required: true, description: "Code" }]
        }
      });
      assert.equal(res.status, 201, `template ${i} creation should succeed`);
    }

    // 6th should be rejected
    const overRes = await create({
      body: {
        userId: "free_user_1",
        title: "Template 6",
        description: "Over-limit template",
        category: "debug",
        promptBody: "Debug {{code_extra}}",
        modelFamilies: ["gpt"],
        variables: [{ key: "code_extra", type: "code", required: true, description: "Code" }]
      }
    });
    assert.equal(overRes.status, 403);
  });
});

// --- E2E: Webhook Idempotency ---

describe("Web E2E: Webhook Idempotency", () => {
  it("duplicate webhook event IDs are rejected", async () => {
    const userRepo = new InMemoryUserBootstrapRepository();
    const eventRepo = new InMemoryPaymentEventRepository();

    // Pre-create the user
    await userRepo.upsertUser("wh_user_1");

    // Mark event as already processed
    const firstResult = await eventRepo.markWebhookEventProcessed({
      provider: "polar",
      eventId: "evt_duplicate_1",
      eventType: "subscription.created"
    });
    assert.equal(firstResult, true, "first processing should succeed");

    // Attempt to process same event again — should return false (duplicate)
    const duplicateResult = await eventRepo.markWebhookEventProcessed({
      provider: "polar",
      eventId: "evt_duplicate_1",
      eventType: "subscription.created"
    });
    assert.equal(duplicateResult, false, "duplicate processing should be rejected");

    // A new event should succeed
    const newResult = await eventRepo.markWebhookEventProcessed({
      provider: "polar",
      eventId: "evt_new_1",
      eventType: "subscription.updated"
    });
    assert.equal(newResult, true, "new event processing should succeed");
  });
});
