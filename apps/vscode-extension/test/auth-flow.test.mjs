import assert from "node:assert/strict";
import test from "node:test";

import {
  beginAuthRequest,
  parseAuthCallbackUri,
  validateAuthCallback
} from "../dist/auth/index.js";

test("beginAuthRequest builds sign-in URL with callback and client state", () => {
  const pending = beginAuthRequest({
    appBaseUrl: "http://localhost:3000",
    callbackUri: "vscode://prmpt.prmpt/auth-callback",
    generateState: () => "client-state-001"
  });

  assert.equal(pending.clientState, "client-state-001");

  const parsed = new URL(pending.authUrl);
  assert.equal(parsed.pathname, "/auth/sign-in");
  assert.equal(parsed.searchParams.get("callback_uri"), "vscode://prmpt.prmpt/auth-callback");
  assert.equal(parsed.searchParams.get("client_state"), "client-state-001");
});

test("validateAuthCallback accepts matching client state", () => {
  const pending = beginAuthRequest({
    appBaseUrl: "http://localhost:3000",
    callbackUri: "vscode://prmpt.prmpt/auth-callback",
    generateState: () => "client-state-002"
  });

  const callback = parseAuthCallbackUri(
    "vscode://prmpt.prmpt/auth-callback?code=abc123&state=server-state&nonce=server-nonce&client_state=client-state-002"
  );

  assert.deepEqual(validateAuthCallback(callback, pending), { ok: true });
});

test("validateAuthCallback rejects mismatched client state", () => {
  const pending = beginAuthRequest({
    appBaseUrl: "http://localhost:3000",
    callbackUri: "vscode://prmpt.prmpt/auth-callback",
    generateState: () => "client-state-003"
  });

  const callback = parseAuthCallbackUri(
    "vscode://prmpt.prmpt/auth-callback?code=abc123&state=server-state&nonce=server-nonce&client_state=bad-state"
  );

  assert.throws(() => validateAuthCallback(callback, pending), /mismatch/i);
});
