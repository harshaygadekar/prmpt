import assert from "node:assert/strict";
import test from "node:test";

import { createAuthPortalRouter, InMemoryAuthStateStore } from "../dist/auth/index.js";

function createDeterministicStore() {
  let stateCounter = 0;
  let nonceCounter = 0;

  return new InMemoryAuthStateStore({
    now: () => 1700000000000,
    generateState: () => `state-${++stateCounter}`,
    generateNonce: () => `nonce-${++nonceCounter}`
  });
}

function createRouter() {
  return createAuthPortalRouter({
    env: {
      appBaseUrl: "http://localhost:3000",
      clerkSignInUrl: "https://clerk.dev/sign-in",
      clerkSignUpUrl: "https://clerk.dev/sign-up"
    },
    stateStore: createDeterministicStore()
  });
}

test("sign-in flow redirects back to extension callback URI", () => {
  const router = createRouter();

  const startResponse = router.handleRequest({
    path: "/auth/sign-in",
    query: {
      callback_uri: "vscode://prmpt.prmpt/auth-callback",
      client_state: "client-state-123"
    }
  });

  assert.equal(startResponse.status, 302);
  assert.ok(startResponse.redirectUrl);

  const clerkUrl = new URL(startResponse.redirectUrl);
  const state = clerkUrl.searchParams.get("state");
  const nonce = clerkUrl.searchParams.get("nonce");

  const callbackResponse = router.handleRequest({
    path: "/api/v1/auth/callback",
    query: {
      state: state ?? undefined,
      nonce: nonce ?? undefined,
      code: "auth-code-123"
    }
  });

  assert.equal(callbackResponse.status, 302);
  assert.ok(callbackResponse.redirectUrl);

  const extensionUrl = new URL(callbackResponse.redirectUrl);
  assert.equal(extensionUrl.protocol, "vscode:");
  assert.equal(extensionUrl.searchParams.get("code"), "auth-code-123");
  assert.equal(extensionUrl.searchParams.get("client_state"), "client-state-123");
});

test("sign-up route returns clerk redirect", () => {
  const router = createRouter();

  const startResponse = router.handleRequest({
    path: "/auth/sign-up",
    query: {
      callback_uri: "vscode://prmpt.prmpt/auth-callback"
    }
  });

  assert.equal(startResponse.status, 302);
  assert.ok(startResponse.redirectUrl);
  assert.match(startResponse.redirectUrl, /sign-up/);
});

test("callback rejects invalid state", () => {
  const router = createRouter();

  const response = router.handleRequest({
    path: "/api/v1/auth/callback",
    query: {
      state: "unknown-state",
      nonce: "nonce-1",
      code: "auth-code-123"
    }
  });

  assert.equal(response.status, 400);
  assert.match(response.body ?? "", /state/i);
});
