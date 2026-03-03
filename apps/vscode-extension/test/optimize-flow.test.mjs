import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  OptimizeOrchestrator,
  createOptimizeHandler,
  mapErrorToFlowError,
  ERROR_CODES
} from "../dist/optimize/index.js";

import {
  createRequest,
  MESSAGE_TYPES,
  HostMessageRouter
} from "../dist/messaging/index.js";

// --- Helpers ---

function makeValidRequest() {
  return {
    prompt: "Explain how closures work in JavaScript",
    modelFamily: "claude",
    outputFormat: "markdown"
  };
}

function makeValidator() {
  return (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return { valid: false, error: "Not an object" };
    }
    const r = raw;
    if (!r.prompt || typeof r.prompt !== "string" || r.prompt.trim().length === 0) {
      return { valid: false, error: "Prompt is required" };
    }
    if (!r.modelFamily) {
      return { valid: false, error: "Model family is required" };
    }
    if (!r.outputFormat) {
      return { valid: false, error: "Output format is required" };
    }
    return { valid: true, request: r };
  };
}

function makeOptimizer(result) {
  return async (req) => ({
    optimizedPrompt: `Optimized: ${req.prompt}`,
    score: 85,
    scoreDetails: undefined,
    metadata: {
      provider: "anthropic",
      modelFamily: req.modelFamily,
      outputFormat: req.outputFormat,
      rulePackVersion: "1.0.0",
      totalDurationMs: 42,
      passCount: 4,
      contentType: "text"
    },
    ...result
  });
}

function makeEntitlementCheck(allowed = true, reason) {
  return async () => ({ allowed, reason });
}

function makeOrchestrator(overrides = {}) {
  return new OptimizeOrchestrator({
    optimize: overrides.optimize ?? makeOptimizer(),
    validate: overrides.validate ?? makeValidator(),
    checkEntitlement: overrides.checkEntitlement ?? makeEntitlementCheck(),
    onStateChange: overrides.onStateChange
  });
}

// --- mapErrorToFlowError ---

describe("mapErrorToFlowError", () => {
  test("maps auth error", () => {
    const err = mapErrorToFlowError(new Error("User must sign in first"));
    assert.equal(err.code, ERROR_CODES.AUTH_REQUIRED);
    assert.ok(err.recoverable);
    assert.equal(err.action, "sign-in");
  });

  test("maps entitlement error", () => {
    const err = mapErrorToFlowError(new Error("Trial limit exceeded"));
    assert.equal(err.code, ERROR_CODES.ENTITLEMENT_BLOCKED);
    assert.ok(err.recoverable);
    assert.equal(err.action, "upgrade");
  });

  test("maps rate limit error", () => {
    const err = mapErrorToFlowError(new Error("Rate limit exceeded"));
    assert.equal(err.code, ERROR_CODES.RATE_LIMITED);
    assert.ok(err.recoverable);
    assert.equal(err.action, "retry");
  });

  test("maps provider unavailable error", () => {
    const err = mapErrorToFlowError(new Error("Provider unavailable"));
    assert.equal(err.code, ERROR_CODES.PROVIDER_UNAVAILABLE);
    assert.ok(err.recoverable);
  });

  test("maps provider API error", () => {
    const err = mapErrorToFlowError(new Error("Provider API timeout"));
    assert.equal(err.code, ERROR_CODES.PROVIDER_ERROR);
    assert.ok(err.recoverable);
  });

  test("maps unknown error", () => {
    const err = mapErrorToFlowError(new Error("Something weird"));
    assert.equal(err.code, ERROR_CODES.UNKNOWN_ERROR);
    assert.ok(!err.recoverable);
  });

  test("handles non-Error values", () => {
    const err = mapErrorToFlowError("string error");
    assert.equal(err.code, ERROR_CODES.UNKNOWN_ERROR);
    assert.equal(err.message, "string error");
  });
});

// --- OptimizeOrchestrator ---

describe("OptimizeOrchestrator", () => {
  test("initial state is idle", () => {
    const orch = makeOrchestrator();
    const state = orch.getState();
    assert.equal(state.status, "idle");
    assert.equal(state.request, undefined);
    assert.equal(state.response, undefined);
    assert.equal(state.error, undefined);
  });

  test("successful optimization flow", async () => {
    const stateChanges = [];
    const orch = makeOrchestrator({
      onStateChange: (s) => stateChanges.push({ ...s })
    });

    const result = await orch.run(makeValidRequest());

    assert.equal(result.status, "success");
    assert.ok(result.response);
    assert.ok(result.response.optimizedPrompt.includes("Optimized:"));
    assert.equal(result.response.score, 85);
    assert.equal(result.error, undefined);

    // Should have transitioned through running -> success
    assert.ok(stateChanges.some((s) => s.status === "running"));
    assert.ok(stateChanges.some((s) => s.status === "success"));
  });

  test("validation failure returns error state", async () => {
    const orch = makeOrchestrator();
    const result = await orch.run({ prompt: "", modelFamily: "claude", outputFormat: "json" });

    assert.equal(result.status, "error");
    assert.equal(result.error.code, ERROR_CODES.VALIDATION_ERROR);
    assert.ok(result.error.recoverable);
  });

  test("entitlement blocked returns error", async () => {
    const orch = makeOrchestrator({
      checkEntitlement: makeEntitlementCheck(false, "Free trial expired")
    });

    const result = await orch.run(makeValidRequest());

    assert.equal(result.status, "error");
    assert.equal(result.error.code, ERROR_CODES.ENTITLEMENT_BLOCKED);
    assert.ok(result.error.message.includes("Free trial expired"));
  });

  test("entitlement check failure maps error", async () => {
    const orch = makeOrchestrator({
      checkEntitlement: async () => {
        throw new Error("Network timeout");
      }
    });

    const result = await orch.run(makeValidRequest());

    assert.equal(result.status, "error");
    assert.ok(result.error);
  });

  test("optimizer failure maps error", async () => {
    const orch = makeOrchestrator({
      optimize: async () => {
        throw new Error("Provider API timeout");
      }
    });

    const result = await orch.run(makeValidRequest());

    assert.equal(result.status, "error");
    assert.equal(result.error.code, ERROR_CODES.PROVIDER_ERROR);
    assert.ok(result.error.recoverable);
  });

  test("reset returns to idle", async () => {
    const orch = makeOrchestrator();
    await orch.run(makeValidRequest());
    assert.equal(orch.getState().status, "success");

    orch.reset();
    assert.equal(orch.getState().status, "idle");
    assert.equal(orch.getState().request, undefined);
  });

  test("run with missing fields returns validation error", async () => {
    const orch = makeOrchestrator();
    const result = await orch.run({ prompt: "hello" });
    assert.equal(result.status, "error");
    assert.equal(result.error.code, ERROR_CODES.VALIDATION_ERROR);
  });
});

// --- createOptimizeHandler + router integration ---

describe("createOptimizeHandler", () => {
  test("success response through handler", async () => {
    const orch = makeOrchestrator();
    const handler = createOptimizeHandler(orch);

    const envelope = createRequest(MESSAGE_TYPES.OPTIMIZE_REQUEST, makeValidRequest());
    const response = await handler(envelope);

    assert.equal(response.type, MESSAGE_TYPES.OPTIMIZE_RESPONSE);
    assert.equal(response.correlationId, envelope.correlationId);
    assert.ok(response.payload.success);
    assert.ok(response.payload.optimizedPrompt);
    assert.equal(response.payload.score, 85);
  });

  test("error response through handler", async () => {
    const orch = makeOrchestrator({
      checkEntitlement: makeEntitlementCheck(false, "Limit reached")
    });
    const handler = createOptimizeHandler(orch);

    const envelope = createRequest(MESSAGE_TYPES.OPTIMIZE_REQUEST, makeValidRequest());
    const response = await handler(envelope);

    assert.equal(response.type, MESSAGE_TYPES.OPTIMIZE_RESPONSE);
    assert.ok(!response.payload.success);
    assert.ok(response.payload.error);
    assert.equal(response.payload.error.code, ERROR_CODES.ENTITLEMENT_BLOCKED);
  });

  test("integrates with HostMessageRouter", async () => {
    const router = new HostMessageRouter();
    const orch = makeOrchestrator();
    router.register(MESSAGE_TYPES.OPTIMIZE_REQUEST, createOptimizeHandler(orch));

    const request = createRequest(MESSAGE_TYPES.OPTIMIZE_REQUEST, makeValidRequest());
    const response = await router.dispatch(request);

    assert.ok(response);
    assert.equal(response.type, MESSAGE_TYPES.OPTIMIZE_RESPONSE);
    assert.ok(response.payload.success);
  });

  test("validation error through router", async () => {
    const router = new HostMessageRouter();
    const orch = makeOrchestrator();
    router.register(MESSAGE_TYPES.OPTIMIZE_REQUEST, createOptimizeHandler(orch));

    const request = createRequest(MESSAGE_TYPES.OPTIMIZE_REQUEST, { prompt: "" });
    const response = await router.dispatch(request);

    assert.ok(response);
    assert.equal(response.type, MESSAGE_TYPES.OPTIMIZE_RESPONSE);
    assert.ok(!response.payload.success);
    assert.equal(response.payload.error.code, ERROR_CODES.VALIDATION_ERROR);
  });
});
