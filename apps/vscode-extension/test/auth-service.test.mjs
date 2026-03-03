import assert from "node:assert/strict";
import test from "node:test";

import { ExtensionAuthService, SecretStorageAuthSessionStore } from "../dist/auth/index.js";

function createSecretStorage(initial = new Map()) {
  return {
    async get(key) {
      return initial.get(key);
    },
    async store(key, value) {
      initial.set(key, value);
    },
    async delete(key) {
      initial.delete(key);
    }
  };
}

test("auth service stores callback session and survives restart", async () => {
  const storeMap = new Map();
  const storage = createSecretStorage(storeMap);
  const sessionStore = new SecretStorageAuthSessionStore(storage);
  const opened = [];
  let now = 1_700_000_000_000;

  const service = new ExtensionAuthService({
    appBaseUrl: "http://localhost:3000",
    callbackUri: "vscode://prmpt.prmpt/auth-callback",
    sessionStore,
    now: () => now
  });

  const pending = await service.startAuth({
    mode: "sign-in",
    openExternal: async (url) => {
      opened.push(url);
      return true;
    }
  });

  assert.equal(opened.length, 1);
  assert.match(opened[0], /auth\/sign-in/);

  const callbackUri =
    "vscode://prmpt.prmpt/auth-callback?code=auth-code-1&state=srv-state&nonce=srv-nonce&client_state=" +
    pending.clientState;

  const session = await service.handleCallbackUri(callbackUri);
  assert.equal(session.code, "auth-code-1");
  assert.equal(session.clientState, pending.clientState);

  const restartedService = new ExtensionAuthService({
    appBaseUrl: "http://localhost:3000",
    callbackUri: "vscode://prmpt.prmpt/auth-callback",
    sessionStore: new SecretStorageAuthSessionStore(storage),
    now: () => now
  });

  const validState = await restartedService.getSessionState();
  assert.equal(validState.state, "valid");
  assert.ok(validState.session);
  assert.equal(validState.session.code, "auth-code-1");
});

test("auth service marks expired sessions and supports sign-out", async () => {
  const storage = createSecretStorage();
  let now = 1_700_000_000_000;
  const sessionStore = new SecretStorageAuthSessionStore(storage);

  const service = new ExtensionAuthService({
    appBaseUrl: "http://localhost:3000",
    callbackUri: "vscode://prmpt.prmpt/auth-callback",
    sessionStore,
    now: () => now,
    offlineGraceMs: 5
  });

  const pending = await service.startAuth({
    openExternal: async () => true
  });

  await service.handleCallbackUri(
    `vscode://prmpt.prmpt/auth-callback?code=auth-code-2&state=srv-state&nonce=srv-nonce&client_state=${pending.clientState}`
  );

  now += 10;
  const expired = await service.getSessionState();
  assert.equal(expired.state, "expired");

  await service.signOut();
  const missing = await service.getSessionState();
  assert.equal(missing.state, "missing");
});

test("auth callback fails when no auth request is pending", async () => {
  const service = new ExtensionAuthService({
    appBaseUrl: "http://localhost:3000",
    callbackUri: "vscode://prmpt.prmpt/auth-callback",
    sessionStore: new SecretStorageAuthSessionStore(createSecretStorage())
  });

  await assert.rejects(
    () =>
      service.handleCallbackUri(
        "vscode://prmpt.prmpt/auth-callback?code=auth-code-3&state=s&nonce=n&client_state=client"
      ),
    /No pending auth request/i
  );
});
