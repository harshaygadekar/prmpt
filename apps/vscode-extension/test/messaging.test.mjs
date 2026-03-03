import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createEnvelope,
  createRequest,
  createResponse,
  createEvent,
  validateEnvelope,
  generateCorrelationId,
  HostMessageRouter,
  WebviewPanelManager,
  MESSAGE_TYPES
} from "../dist/messaging/index.js";

// --- Helpers ---

function createMockPanel() {
  const messages = [];
  const listeners = [];
  return {
    messages,
    listeners,
    async postMessage(msg) {
      messages.push(msg);
      return true;
    },
    onDidReceiveMessage(listener) {
      listeners.push(listener);
      return {
        dispose() {
          const idx = listeners.indexOf(listener);
          if (idx >= 0) listeners.splice(idx, 1);
        }
      };
    },
    dispose() {
      listeners.length = 0;
    },
    // Simulate receiving a message from the webview
    simulateMessage(msg) {
      for (const l of listeners) {
        l(msg);
      }
    }
  };
}

// --- Envelope creation ---

describe("createEnvelope", () => {
  test("creates envelope with all required fields", () => {
    const env = createEnvelope("test.type", "webview-to-host", { foo: "bar" });
    assert.equal(env.type, "test.type");
    assert.equal(env.direction, "webview-to-host");
    assert.deepEqual(env.payload, { foo: "bar" });
    assert.ok(env.correlationId);
    assert.ok(env.timestamp > 0);
  });

  test("uses provided correlationId", () => {
    const env = createEnvelope("test.type", "host-to-webview", null, "custom-id");
    assert.equal(env.correlationId, "custom-id");
  });
});

describe("createRequest", () => {
  test("creates webview-to-host request", () => {
    const req = createRequest(MESSAGE_TYPES.OPTIMIZE_REQUEST, { prompt: "hi" });
    assert.equal(req.direction, "webview-to-host");
    assert.equal(req.type, "optimize.request");
  });
});

describe("createResponse", () => {
  test("creates host-to-webview response with correlation", () => {
    const resp = createResponse(MESSAGE_TYPES.OPTIMIZE_RESPONSE, { result: "ok" }, "cor-123");
    assert.equal(resp.direction, "host-to-webview");
    assert.equal(resp.correlationId, "cor-123");
  });
});

describe("createEvent", () => {
  test("creates host-to-webview event", () => {
    const evt = createEvent(MESSAGE_TYPES.AUTH_STATE_CHANGED, { state: "signed-in" });
    assert.equal(evt.direction, "host-to-webview");
    assert.equal(evt.type, "auth.stateChanged");
  });
});

// --- Correlation ID ---

describe("generateCorrelationId", () => {
  test("returns unique ids", () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    assert.notEqual(id1, id2);
    assert.ok(id1.startsWith("cor-"));
    assert.ok(id2.startsWith("cor-"));
  });
});

// --- Envelope validation ---

describe("validateEnvelope", () => {
  test("accepts valid envelope", () => {
    const env = createRequest("test", { data: 1 });
    const result = validateEnvelope(env);
    assert.ok(result.valid);
    assert.ok(result.envelope);
    assert.equal(result.error, undefined);
  });

  test("rejects missing type", () => {
    const result = validateEnvelope({
      direction: "webview-to-host",
      correlationId: "c1",
      timestamp: Date.now(),
      payload: null
    });
    assert.ok(!result.valid);
    assert.ok(result.error);
  });

  test("rejects missing direction", () => {
    const result = validateEnvelope({
      type: "test",
      correlationId: "c1",
      timestamp: Date.now(),
      payload: null
    });
    assert.ok(!result.valid);
  });

  test("rejects missing correlationId", () => {
    const result = validateEnvelope({
      type: "test",
      direction: "webview-to-host",
      timestamp: Date.now(),
      payload: null
    });
    assert.ok(!result.valid);
  });

  test("rejects non-object input", () => {
    const result = validateEnvelope("not an object");
    assert.ok(!result.valid);
  });

  test("rejects null", () => {
    const result = validateEnvelope(null);
    assert.ok(!result.valid);
  });

  test("rejects invalid direction", () => {
    const result = validateEnvelope({
      type: "test",
      direction: "wrong-direction",
      correlationId: "c1",
      timestamp: Date.now(),
      payload: null
    });
    assert.ok(!result.valid);
  });
});

// --- HostMessageRouter ---

describe("HostMessageRouter", () => {
  test("dispatches to registered handler", async () => {
    const router = new HostMessageRouter();
    let received = null;
    router.register("test.ping", (env) => {
      received = env;
      return createResponse("test.pong", { ok: true }, env.correlationId);
    });

    const request = createRequest("test.ping", { data: "hello" });
    const response = await router.dispatch(request);

    assert.ok(received);
    assert.equal(received.type, "test.ping");
    assert.ok(response);
    assert.equal(response.type, "test.pong");
  });

  test("returns error for unknown message type", async () => {
    const unknowns = [];
    const router = new HostMessageRouter({
      onUnknownType: (env) => unknowns.push(env)
    });

    const request = createRequest("unknown.type", {});
    const response = await router.dispatch(request);

    assert.ok(response);
    assert.equal(response.type, MESSAGE_TYPES.ERROR_NOTIFICATION);
    assert.equal(response.payload.code, "unknown_message_type");
    assert.equal(unknowns.length, 1);
  });

  test("returns error for invalid envelope", async () => {
    const validationErrors = [];
    const router = new HostMessageRouter({
      onValidationError: (raw, err) => validationErrors.push({ raw, err })
    });

    const response = await router.dispatch({ bad: "data" });

    assert.ok(response);
    assert.equal(response.type, MESSAGE_TYPES.ERROR_NOTIFICATION);
    assert.equal(response.payload.code, "invalid_envelope");
    assert.equal(validationErrors.length, 1);
  });

  test("returns error when handler throws", async () => {
    const router = new HostMessageRouter();
    router.register("test.fail", () => {
      throw new Error("Handler crashed");
    });

    const request = createRequest("test.fail", {});
    const response = await router.dispatch(request);

    assert.ok(response);
    assert.equal(response.type, MESSAGE_TYPES.ERROR_NOTIFICATION);
    assert.equal(response.payload.code, "handler_error");
    assert.ok(response.payload.message.includes("Handler crashed"));
  });

  test("handler returning void produces no response", async () => {
    const router = new HostMessageRouter();
    router.register("test.void", () => {
      // no return
    });

    const request = createRequest("test.void", {});
    const response = await router.dispatch(request);
    assert.equal(response, undefined);
  });

  test("register and unregister handlers", () => {
    const router = new HostMessageRouter();
    router.register("a", () => {});
    router.register("b", () => {});
    assert.ok(router.hasHandler("a"));
    assert.ok(router.hasHandler("b"));
    assert.deepEqual(router.getRegisteredTypes().sort(), ["a", "b"]);

    router.unregister("a");
    assert.ok(!router.hasHandler("a"));
    assert.ok(router.hasHandler("b"));
  });

  test("preserves correlationId in error response", async () => {
    const router = new HostMessageRouter();
    const request = createRequest("missing", {});
    const response = await router.dispatch(request);
    assert.equal(response.correlationId, request.correlationId);
  });
});

// --- WebviewPanelManager ---

describe("WebviewPanelManager", () => {
  test("attach routes messages through router", async () => {
    const router = new HostMessageRouter();
    let handlerCalled = false;
    router.register("test.ping", (env) => {
      handlerCalled = true;
      return createResponse("test.pong", { ok: true }, env.correlationId);
    });

    const manager = new WebviewPanelManager({ router });
    const panel = createMockPanel();
    manager.attach("main", panel);

    // Simulate webview sending a message
    const request = createRequest("test.ping", {});
    panel.simulateMessage(request);

    // Give async handler time to complete
    await new Promise((r) => setTimeout(r, 10));

    assert.ok(handlerCalled);
    assert.equal(panel.messages.length, 1);
    assert.equal(panel.messages[0].type, "test.pong");
  });

  test("detach stops routing", async () => {
    const router = new HostMessageRouter();
    router.register("test.ping", (env) =>
      createResponse("test.pong", {}, env.correlationId)
    );

    const manager = new WebviewPanelManager({ router });
    const panel = createMockPanel();
    manager.attach("main", panel);
    manager.detach("main");

    const request = createRequest("test.ping", {});
    panel.simulateMessage(request);
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(panel.messages.length, 0);
    assert.ok(!manager.hasPanel("main"));
  });

  test("broadcast sends to all attached panels", async () => {
    const router = new HostMessageRouter();
    const manager = new WebviewPanelManager({ router });

    const panel1 = createMockPanel();
    const panel2 = createMockPanel();
    manager.attach("p1", panel1);
    manager.attach("p2", panel2);

    const event = createEvent("auth.stateChanged", { state: "signed-in" });
    await manager.broadcast(event);

    assert.equal(panel1.messages.length, 1);
    assert.equal(panel2.messages.length, 1);
    assert.equal(panel1.messages[0].type, "auth.stateChanged");
    assert.equal(panel2.messages[0].type, "auth.stateChanged");
  });

  test("getPanelIds returns attached panels", () => {
    const router = new HostMessageRouter();
    const manager = new WebviewPanelManager({ router });
    const panel = createMockPanel();
    manager.attach("sidebar", panel);

    assert.deepEqual(manager.getPanelIds(), ["sidebar"]);
    assert.ok(manager.hasPanel("sidebar"));
    assert.ok(!manager.hasPanel("missing"));
  });

  test("disposeAll cleans up all panels", () => {
    const router = new HostMessageRouter();
    const manager = new WebviewPanelManager({ router });

    manager.attach("p1", createMockPanel());
    manager.attach("p2", createMockPanel());
    assert.equal(manager.getPanelIds().length, 2);

    manager.disposeAll();
    assert.equal(manager.getPanelIds().length, 0);
  });

  test("re-attach replaces previous panel", async () => {
    const router = new HostMessageRouter();
    router.register("test.ping", (env) =>
      createResponse("test.pong", {}, env.correlationId)
    );

    const manager = new WebviewPanelManager({ router });
    const panel1 = createMockPanel();
    const panel2 = createMockPanel();

    manager.attach("main", panel1);
    manager.attach("main", panel2);

    // Should only route to panel2 now
    const request = createRequest("test.ping", {});
    panel2.simulateMessage(request);
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(panel2.messages.length, 1);
    // panel1 listener was disposed, so no routing even if we simulate
    assert.equal(panel1.messages.length, 0);
  });

  test("handles postMessage error gracefully", async () => {
    const router = new HostMessageRouter();
    router.register("test.ping", (env) =>
      createResponse("test.pong", {}, env.correlationId)
    );

    const postErrors = [];
    const manager = new WebviewPanelManager({
      router,
      onPostError: (err) => postErrors.push(err)
    });

    const failPanel = {
      async postMessage() {
        throw new Error("Panel disposed");
      },
      onDidReceiveMessage(listener) {
        // Store listener so we can trigger it
        failPanel._listener = listener;
        return { dispose() {} };
      },
      _listener: null,
      dispose() {}
    };

    manager.attach("fail", failPanel);

    // Trigger message that generates a response
    const request = createRequest("test.ping", {});
    failPanel._listener(request);
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(postErrors.length, 1);
    assert.ok(postErrors[0].message.includes("Panel disposed"));
  });
});
