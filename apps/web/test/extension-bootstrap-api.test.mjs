import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryUserBootstrapRepository } from "@prmpt/data-access";
import { createExtensionBootstrapApi } from "../dist/api/extension-bootstrap.js";

test("bootstrap API upserts user and returns default trial state", async () => {
  const repository = new InMemoryUserBootstrapRepository(() => new Date("2026-03-03T00:00:00.000Z"));
  const handler = createExtensionBootstrapApi({ userRepository: repository });

  const response = await handler({
    body: {
      clerkUserId: "user_123",
      platform: "vscode"
    }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    userId: "user_123",
    sessionLimit: 9,
    remainingSessions: 9,
    isPremium: false
  });
});

test("bootstrap API rejects invalid payload", async () => {
  const handler = createExtensionBootstrapApi();

  const response = await handler({
    body: {
      platform: "vscode"
    }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_request");
});
