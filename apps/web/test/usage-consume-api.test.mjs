import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryUserBootstrapRepository } from "@prmpt/data-access";
import { createUsageConsumeApi } from "../dist/api/usage-consume.js";

test("usage consume enforces 8/9/10 trial boundary", async () => {
  const repository = new InMemoryUserBootstrapRepository(() => new Date("2026-03-03T00:00:00.000Z"));
  const userId = "user_boundary";

  await repository.upsertUser(userId);
  await repository.incrementSessions(userId, 8);
  const handler = createUsageConsumeApi({ userRepository: repository });

  const ninthResponse = await handler({
    body: {
      userId,
      sessionCount: 1
    }
  });

  assert.equal(ninthResponse.status, 200);
  assert.deepEqual(ninthResponse.body, {
    userId,
    consumedSessions: 1,
    remainingSessions: 0,
    isPremium: false
  });

  const tenthResponse = await handler({
    body: {
      userId,
      sessionCount: 1
    }
  });

  assert.equal(tenthResponse.status, 403);
  assert.deepEqual(tenthResponse.body, {
    error: "trial_exhausted",
    remainingSessions: 0,
    isPremium: false
  });
});

test("usage consume bypasses trial block for premium users", async () => {
  const repository = new InMemoryUserBootstrapRepository(() => new Date("2026-03-03T00:00:00.000Z"));
  const userId = "user_premium";

  await repository.upsertUser(userId);
  await repository.setPremium(userId, true);
  const handler = createUsageConsumeApi({ userRepository: repository });

  const response = await handler({
    body: {
      userId,
      sessionCount: 3
    }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    userId,
    consumedSessions: 3,
    remainingSessions: 9,
    isPremium: true
  });
});

test("usage consume rejects invalid payload", async () => {
  const handler = createUsageConsumeApi();

  const response = await handler({
    body: {
      userId: "user_123",
      sessionCount: 0
    }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_request");
});
