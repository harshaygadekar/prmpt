import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createTechniqueListHandler,
  createTechniqueValidateHandler
} from "../dist/techniques/index.js";
import {
  createRequest,
  MESSAGE_TYPES
} from "../dist/messaging/index.js";

describe("Technique list handler", () => {
  test("returns all techniques when no modelFamily specified", () => {
    const handler = createTechniqueListHandler();
    const envelope = createRequest(MESSAGE_TYPES.TECHNIQUE_LIST_REQUEST, {});
    const response = handler(envelope);

    assert.equal(response.type, MESSAGE_TYPES.TECHNIQUE_LIST_RESPONSE);
    const payload = response.payload;
    assert.ok(Array.isArray(payload.techniques));
    assert.equal(payload.techniques.length, 7);
  });

  test("filters techniques by modelFamily", () => {
    const handler = createTechniqueListHandler();
    const envelope = createRequest(MESSAGE_TYPES.TECHNIQUE_LIST_REQUEST, {
      modelFamily: "local"
    });
    const response = handler(envelope);
    const payload = response.payload;

    assert.ok(Array.isArray(payload.techniques));
    // local supports: simplification, output-constraints, role-priming
    assert.ok(payload.techniques.some((t) => t.id === "simplification"));
    assert.ok(payload.techniques.some((t) => t.id === "role-priming"));
    // xml-tagging not compatible with local
    assert.ok(!payload.techniques.some((t) => t.id === "xml-tagging"));
  });

  test("returns techniques sorted by order", () => {
    const handler = createTechniqueListHandler();
    const envelope = createRequest(MESSAGE_TYPES.TECHNIQUE_LIST_REQUEST, {
      modelFamily: "gpt"
    });
    const response = handler(envelope);
    const techs = response.payload.techniques;

    for (let i = 1; i < techs.length; i++) {
      assert.ok(techs[i].order >= techs[i - 1].order);
    }
  });
});

describe("Technique validate handler", () => {
  test("validates compatible selection", () => {
    const handler = createTechniqueValidateHandler();
    const envelope = createRequest(MESSAGE_TYPES.TECHNIQUE_VALIDATE_REQUEST, {
      techniques: ["xml-tagging", "role-priming"],
      modelFamily: "claude"
    });
    const response = handler(envelope);

    assert.equal(response.type, MESSAGE_TYPES.TECHNIQUE_VALIDATE_RESPONSE);
    const payload = response.payload;
    assert.equal(payload.valid, true);
    assert.equal(payload.conflicts.length, 0);
    assert.equal(payload.warnings.length, 0);
    assert.ok(payload.resolved.length === 2);
  });

  test("detects conflicting techniques", () => {
    const handler = createTechniqueValidateHandler();
    const envelope = createRequest(MESSAGE_TYPES.TECHNIQUE_VALIDATE_REQUEST, {
      techniques: ["step-decomposition", "simplification"],
      modelFamily: "gemini"
    });
    const response = handler(envelope);
    const payload = response.payload;

    assert.equal(payload.valid, false);
    assert.ok(payload.conflicts.length > 0);
  });

  test("detects incompatible model family", () => {
    const handler = createTechniqueValidateHandler();
    const envelope = createRequest(MESSAGE_TYPES.TECHNIQUE_VALIDATE_REQUEST, {
      techniques: ["simplification"],
      modelFamily: "claude"
    });
    const response = handler(envelope);
    const payload = response.payload;

    assert.equal(payload.valid, false);
    assert.ok(payload.warnings.some((w) => /not compatible/i.test(w)));
  });

  test("returns error for invalid payload", () => {
    const handler = createTechniqueValidateHandler();
    const envelope = createRequest(MESSAGE_TYPES.TECHNIQUE_VALIDATE_REQUEST, {});
    const response = handler(envelope);
    const payload = response.payload;

    assert.equal(payload.valid, false);
    assert.ok(payload.warnings.length > 0);
  });

  test("resolves techniques in deterministic order", () => {
    const handler = createTechniqueValidateHandler();
    const e1 = createRequest(MESSAGE_TYPES.TECHNIQUE_VALIDATE_REQUEST, {
      techniques: ["output-constraints", "role-priming", "xml-tagging"],
      modelFamily: "claude"
    });
    const e2 = createRequest(MESSAGE_TYPES.TECHNIQUE_VALIDATE_REQUEST, {
      techniques: ["xml-tagging", "output-constraints", "role-priming"],
      modelFamily: "claude"
    });

    const r1 = handler(e1).payload;
    const r2 = handler(e2).payload;

    assert.deepEqual(r1.resolved, r2.resolved);
    // order: role-priming(5), xml-tagging(10), output-constraints(30)
    assert.equal(r1.resolved[0], "role-priming");
    assert.equal(r1.resolved[1], "xml-tagging");
    assert.equal(r1.resolved[2], "output-constraints");
  });
});
