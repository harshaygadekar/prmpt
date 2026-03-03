import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  OnboardingManager,
  buildAccountSnapshot,
  buildStatusBarState,
  createOnboardingStateHandler,
  createOnboardingCompleteStepHandler,
  createOnboardingSkipHandler,
  createAccountSnapshotHandler,
  createAccountStateChangedEvent
} from "../dist/onboarding/index.js";
import { createRequest } from "../dist/messaging/index.js";

// --- In-memory storage mock ---
function createMockStorage() {
  const store = new Map();
  return {
    get: async (key) => store.get(key),
    store: async (key, value) => { store.set(key, value); },
    _store: store
  };
}

function noop() {}
async function noopWarning() { return undefined; }

function createManager(overrides = {}) {
  const storage = createMockStorage();
  return {
    manager: new OnboardingManager({
      storage,
      showInfo: noop,
      showWarning: noopWarning,
      ...overrides
    }),
    storage
  };
}

describe("OnboardingManager", () => {
  it("starts at welcome step with empty completed steps", () => {
    const { manager } = createManager();
    const state = manager.getState();
    assert.equal(state.currentStep, "welcome");
    assert.deepEqual(state.completedSteps, []);
    assert.equal(state.skipped, false);
    assert.equal(state.completedAt, undefined);
  });

  it("completes a step and advances to next", async () => {
    const { manager } = createManager();
    const state = await manager.completeStep("welcome");
    assert.equal(state.currentStep, "auth_prompt");
    assert.ok(state.completedSteps.includes("welcome"));
  });

  it("completes all steps and reaches completed state", async () => {
    const { manager } = createManager();
    await manager.completeStep("welcome");
    await manager.completeStep("auth_prompt");
    await manager.completeStep("provider_setup");
    const state = await manager.completeStep("first_optimize");
    assert.equal(state.currentStep, "completed");
    assert.ok(manager.isComplete());
    assert.ok(typeof state.completedAt === "number");
  });

  it("skips onboarding and marks all complete", async () => {
    const { manager } = createManager();
    const state = await manager.skipOnboarding();
    assert.equal(state.currentStep, "completed");
    assert.equal(state.skipped, true);
    assert.ok(manager.isComplete());
  });

  it("resets to initial state", async () => {
    const { manager } = createManager();
    await manager.completeStep("welcome");
    const state = await manager.reset();
    assert.equal(state.currentStep, "welcome");
    assert.deepEqual(state.completedSteps, []);
    assert.equal(state.skipped, false);
  });

  it("persists and loads state from storage", async () => {
    const storage = createMockStorage();
    const m1 = new OnboardingManager({ storage, showInfo: noop, showWarning: noopWarning });
    await m1.completeStep("welcome");
    await m1.completeStep("auth_prompt");

    const m2 = new OnboardingManager({ storage, showInfo: noop, showWarning: noopWarning });
    const loaded = await m2.load();
    assert.equal(loaded.currentStep, "provider_setup");
    assert.ok(loaded.completedSteps.includes("welcome"));
    assert.ok(loaded.completedSteps.includes("auth_prompt"));
  });

  it("handles corrupted storage gracefully", async () => {
    const storage = createMockStorage();
    await storage.store("prmpt.onboarding.state", "{{invalid json}}");
    const m = new OnboardingManager({ storage, showInfo: noop, showWarning: noopWarning });
    const loaded = await m.load();
    assert.equal(loaded.currentStep, "welcome");
  });

  it("does not duplicate completed steps", async () => {
    const { manager } = createManager();
    await manager.completeStep("welcome");
    await manager.completeStep("welcome");
    const state = manager.getState();
    assert.equal(state.completedSteps.filter((s) => s === "welcome").length, 1);
  });

  it("promptFirstRun calls openWalkthrough on Get Started", async () => {
    let walkthroughOpened = false;
    const { manager } = createManager({
      showWarning: async () => "Get Started",
      openWalkthrough: () => { walkthroughOpened = true; }
    });
    await manager.promptFirstRun();
    assert.ok(walkthroughOpened);
    assert.ok(manager.getState().completedSteps.includes("welcome"));
  });

  it("promptFirstRun skips on Skip action", async () => {
    const { manager } = createManager({
      showWarning: async () => "Skip"
    });
    await manager.promptFirstRun();
    assert.ok(manager.isComplete());
    assert.equal(manager.getState().skipped, true);
  });

  it("promptFirstRun does nothing if already complete", async () => {
    let warningCalled = false;
    const { manager } = createManager({
      showWarning: async () => { warningCalled = true; return undefined; }
    });
    await manager.skipOnboarding();
    await manager.promptFirstRun();
    assert.equal(warningCalled, false);
  });

  it("fires onStateChange callback", async () => {
    const events = [];
    const { manager } = createManager({
      onStateChange: (s) => events.push(s)
    });
    await manager.completeStep("welcome");
    assert.equal(events.length, 1);
    assert.equal(events[0].currentStep, "auth_prompt");
  });
});

describe("buildAccountSnapshot", () => {
  it("returns signed-out snapshot when no userId", () => {
    const snap = buildAccountSnapshot(undefined, undefined);
    assert.equal(snap.signedIn, false);
    assert.equal(snap.isPremium, false);
    assert.equal(snap.remainingSessions, 0);
  });

  it("returns signed-in trial snapshot", () => {
    const snap = buildAccountSnapshot("user_1", {
      state: "active_trial",
      isPremium: false,
      remainingSessions: 5
    });
    assert.equal(snap.signedIn, true);
    assert.equal(snap.isPremium, false);
    assert.equal(snap.remainingSessions, 5);
  });

  it("returns premium snapshot", () => {
    const snap = buildAccountSnapshot("user_1", {
      state: "premium_active",
      isPremium: true
    });
    assert.ok(snap.isPremium);
  });
});

describe("buildStatusBarState", () => {
  it("shows sign-in for signed-out user", () => {
    const bar = buildStatusBarState({ signedIn: false, userId: undefined, isPremium: false, remainingSessions: 0, displayName: undefined });
    assert.ok(bar.text.includes("Sign In"));
    assert.equal(bar.command, "prmpt.auth.signIn");
  });

  it("shows Premium for premium user", () => {
    const bar = buildStatusBarState({ signedIn: true, userId: "u1", isPremium: true, remainingSessions: 9, displayName: undefined });
    assert.ok(bar.text.includes("Premium"));
    assert.equal(bar.icon, "check");
  });

  it("shows Trial Ended for exhausted user", () => {
    const bar = buildStatusBarState({ signedIn: true, userId: "u1", isPremium: false, remainingSessions: 0, displayName: undefined });
    assert.ok(bar.text.includes("Trial Ended"));
    assert.equal(bar.command, "prmpt.entitlement.upgrade");
  });

  it("shows warning for low sessions", () => {
    const bar = buildStatusBarState({ signedIn: true, userId: "u1", isPremium: false, remainingSessions: 2, displayName: undefined });
    assert.ok(bar.text.includes("2 left"));
    assert.equal(bar.icon, "warning");
  });

  it("shows normal count for healthy trial", () => {
    const bar = buildStatusBarState({ signedIn: true, userId: "u1", isPremium: false, remainingSessions: 7, displayName: undefined });
    assert.ok(bar.text.includes("7 left"));
    assert.equal(bar.icon, "account");
  });
});

describe("Onboarding message handlers", () => {
  it("createOnboardingStateHandler returns current state", async () => {
    const { manager } = createManager();
    const handler = createOnboardingStateHandler(manager);
    const env = createRequest("onboarding.state.request", {});
    const res = await handler(env);
    assert.equal(res.payload.currentStep, "welcome");
  });

  it("createOnboardingCompleteStepHandler completes valid step", async () => {
    const { manager } = createManager();
    const handler = createOnboardingCompleteStepHandler(manager);
    const env = createRequest("onboarding.completeStep.request", { step: "welcome" });
    const res = await handler(env);
    assert.equal(res.payload.success, true);
    assert.equal(res.payload.state.currentStep, "auth_prompt");
  });

  it("createOnboardingCompleteStepHandler rejects invalid step", async () => {
    const { manager } = createManager();
    const handler = createOnboardingCompleteStepHandler(manager);
    const env = createRequest("onboarding.completeStep.request", { step: "bogus" });
    const res = await handler(env);
    assert.equal(res.payload.success, false);
    assert.ok(res.payload.error.includes("Invalid"));
  });

  it("createOnboardingSkipHandler skips onboarding", async () => {
    const { manager } = createManager();
    const handler = createOnboardingSkipHandler(manager);
    const env = createRequest("onboarding.skip.request", {});
    const res = await handler(env);
    assert.equal(res.payload.success, true);
    assert.equal(res.payload.state.currentStep, "completed");
  });

  it("createAccountSnapshotHandler returns snapshot", async () => {
    const handler = createAccountSnapshotHandler(() => ({
      signedIn: true, userId: "u1", isPremium: false, remainingSessions: 5, displayName: undefined
    }));
    const env = createRequest("account.snapshot.request", {});
    const res = await handler(env);
    assert.equal(res.payload.signedIn, true);
    assert.equal(res.payload.remainingSessions, 5);
  });

  it("createAccountStateChangedEvent creates event envelope", () => {
    const event = createAccountStateChangedEvent({
      signedIn: true, userId: "u1", isPremium: true, remainingSessions: 9, displayName: undefined
    });
    assert.equal(event.type, "account.stateChanged");
    assert.equal(event.direction, "host-to-webview");
    assert.equal(event.payload.isPremium, true);
  });
});
