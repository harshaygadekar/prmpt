import assert from "node:assert/strict";
import test from "node:test";

import { activate } from "../dist/extension.js";
import {
  AUTH_SESSION_SECRET_KEY
} from "../dist/auth/index.js";
import {
  AUTH_SIGN_IN_COMMAND,
  AUTH_SIGN_OUT_COMMAND,
  AUTH_SIGN_UP_COMMAND
} from "../dist/host.js";

function createMemorySecretStorage() {
  const store = new Map();
  return {
    store,
    api: {
      async get(key) {
        return store.get(key);
      },
      async store(key, value) {
        store.set(key, value);
      },
      async delete(key) {
        store.delete(key);
      }
    }
  };
}

function createContext() {
  const storage = createMemorySecretStorage();
  const subscriptions = [];

  return {
    storage,
    context: {
      secrets: storage.api,
      subscriptions: {
        push(...items) {
          subscriptions.push(...items);
          return subscriptions.length;
        }
      }
    }
  };
}

test("activate wires commands + URI handler and supports sign-out", async () => {
  process.env.APP_BASE_URL = "http://localhost:3000";
  process.env.VSCODE_CALLBACK_URI = "vscode://prmpt.prmpt/auth-callback";
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_value";

  const commandHandlers = new Map();
  const externalUrls = [];
  let uriHandler;
  const infoMessages = [];
  const errorMessages = [];

  const host = {
    registerCommand(commandId, callback) {
      commandHandlers.set(commandId, callback);
      return { dispose() {} };
    },
    registerUriHandler(handler) {
      uriHandler = handler;
      return { dispose() {} };
    },
    async openExternal(url) {
      externalUrls.push(url);
      return true;
    },
    showInformationMessage(message) {
      infoMessages.push(message);
    },
    showErrorMessage(message) {
      errorMessages.push(message);
    }
  };

  const { context, storage } = createContext();
  activate(context, host);

  assert.ok(commandHandlers.has(AUTH_SIGN_IN_COMMAND));
  assert.ok(commandHandlers.has(AUTH_SIGN_UP_COMMAND));
  assert.ok(commandHandlers.has(AUTH_SIGN_OUT_COMMAND));
  assert.ok(uriHandler);

  await commandHandlers.get(AUTH_SIGN_IN_COMMAND)();
  assert.equal(externalUrls.length, 1);
  const signInUrl = new URL(externalUrls[0]);
  const clientState = signInUrl.searchParams.get("client_state");
  assert.ok(clientState);

  await uriHandler.handleUri(
    `vscode://prmpt.prmpt/auth-callback?code=abc123&state=server-state&nonce=server-nonce&client_state=${clientState}`
  );

  assert.ok(storage.store.has(AUTH_SESSION_SECRET_KEY));
  assert.equal(errorMessages.length, 0);

  await commandHandlers.get(AUTH_SIGN_OUT_COMMAND)();
  assert.equal(storage.store.has(AUTH_SESSION_SECRET_KEY), false);
  assert.ok(infoMessages.some((message) => /Signed out/i.test(message)));
});
