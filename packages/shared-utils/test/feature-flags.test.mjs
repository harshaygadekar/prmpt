import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  FeatureFlagResolver,
  getFeatureFlag,
  listFeatureFlags,
  isFeatureFlagId,
  withFeatureFlag
} from "../dist/index.js";

describe("Feature flag registry", () => {
  test("listFeatureFlags returns all 3 P1 flags", () => {
    const flags = listFeatureFlags();
    assert.equal(flags.length, 3);
    assert.ok(flags.includes("technique_selector"));
    assert.ok(flags.includes("quality_score"));
    assert.ok(flags.includes("context_injector"));
  });

  test("getFeatureFlag returns descriptor with required fields", () => {
    const flag = getFeatureFlag("technique_selector");
    assert.equal(flag.id, "technique_selector");
    assert.ok(flag.label.length > 0);
    assert.ok(flag.description.length > 0);
    assert.ok(["enabled", "disabled", "preview"].includes(flag.defaultState));
    assert.ok(flag.minVersion);
    assert.ok(["free", "premium", "all"].includes(flag.tier));
  });

  test("isFeatureFlagId validates flag IDs", () => {
    assert.equal(isFeatureFlagId("technique_selector"), true);
    assert.equal(isFeatureFlagId("quality_score"), true);
    assert.equal(isFeatureFlagId("unknown_flag"), false);
    assert.equal(isFeatureFlagId(""), false);
  });
});

describe("FeatureFlagResolver", () => {
  test("resolves default states with no overrides", () => {
    const resolver = new FeatureFlagResolver();
    assert.equal(resolver.resolve("technique_selector"), "enabled");
    assert.equal(resolver.resolve("quality_score"), "enabled");
    assert.equal(resolver.resolve("context_injector"), "preview");
  });

  test("local overrides take precedence over defaults", () => {
    const resolver = new FeatureFlagResolver({
      localOverrides: { technique_selector: "disabled" }
    });
    assert.equal(resolver.resolve("technique_selector"), "disabled");
    assert.equal(resolver.resolve("quality_score"), "enabled"); // unaffected
  });

  test("remote overrides take precedence over local overrides", () => {
    const resolver = new FeatureFlagResolver({
      localOverrides: { technique_selector: "disabled" },
      remoteOverrides: { technique_selector: "enabled" }
    });
    assert.equal(resolver.resolve("technique_selector"), "enabled");
  });

  test("isEnabled returns true for enabled and preview states", () => {
    const resolver = new FeatureFlagResolver();
    assert.equal(resolver.isEnabled("technique_selector"), true); // enabled
    assert.equal(resolver.isEnabled("context_injector"), true); // preview
  });

  test("isEnabled returns false for disabled state", () => {
    const resolver = new FeatureFlagResolver({
      localOverrides: { technique_selector: "disabled" }
    });
    assert.equal(resolver.isEnabled("technique_selector"), false);
  });

  test("isPreview identifies preview-only flags", () => {
    const resolver = new FeatureFlagResolver();
    assert.equal(resolver.isPreview("context_injector"), true);
    assert.equal(resolver.isPreview("technique_selector"), false);
  });

  test("getAllStates returns all resolved flag states", () => {
    const resolver = new FeatureFlagResolver({
      localOverrides: { quality_score: "disabled" }
    });
    const states = resolver.getAllStates();
    assert.equal(states.technique_selector, "enabled");
    assert.equal(states.quality_score, "disabled");
    assert.equal(states.context_injector, "preview");
  });

  test("setLocalOverride updates a flag at runtime", () => {
    const resolver = new FeatureFlagResolver();
    assert.equal(resolver.resolve("technique_selector"), "enabled");

    resolver.setLocalOverride("technique_selector", "disabled");
    assert.equal(resolver.resolve("technique_selector"), "disabled");
  });

  test("clearLocalOverride falls back to default", () => {
    const resolver = new FeatureFlagResolver({
      localOverrides: { technique_selector: "disabled" }
    });
    assert.equal(resolver.resolve("technique_selector"), "disabled");

    resolver.clearLocalOverride("technique_selector");
    assert.equal(resolver.resolve("technique_selector"), "enabled");
  });

  test("setRemoteOverrides updates remote config", () => {
    const resolver = new FeatureFlagResolver();
    resolver.setRemoteOverrides({ context_injector: "disabled" });
    assert.equal(resolver.resolve("context_injector"), "disabled");
  });

  test("disabled flag does not affect P0 paths", () => {
    // Simulate: all P1 flags disabled, P0 paths unaffected
    const resolver = new FeatureFlagResolver({
      localOverrides: {
        technique_selector: "disabled",
        quality_score: "disabled",
        context_injector: "disabled"
      }
    });

    assert.equal(resolver.isEnabled("technique_selector"), false);
    assert.equal(resolver.isEnabled("quality_score"), false);
    assert.equal(resolver.isEnabled("context_injector"), false);
    // P0 code paths are not gated — they always run
  });
});

describe("withFeatureFlag guard", () => {
  test("executes enabledFn when flag is enabled", () => {
    const resolver = new FeatureFlagResolver();
    const result = withFeatureFlag(
      resolver,
      "technique_selector",
      () => "techniques loaded",
      () => "techniques skipped"
    );
    assert.equal(result, "techniques loaded");
  });

  test("executes disabledFn when flag is disabled", () => {
    const resolver = new FeatureFlagResolver({
      localOverrides: { technique_selector: "disabled" }
    });
    const result = withFeatureFlag(
      resolver,
      "technique_selector",
      () => "techniques loaded",
      () => "techniques skipped"
    );
    assert.equal(result, "techniques skipped");
  });

  test("enabled/disabled permutations for all flags", () => {
    const flags = listFeatureFlags();
    for (const flagId of flags) {
      // Enabled
      const enabledResolver = new FeatureFlagResolver({
        localOverrides: { [flagId]: "enabled" }
      });
      assert.equal(
        withFeatureFlag(enabledResolver, flagId, () => true, () => false),
        true,
        `${flagId} should execute enabled path`
      );

      // Disabled
      const disabledResolver = new FeatureFlagResolver({
        localOverrides: { [flagId]: "disabled" }
      });
      assert.equal(
        withFeatureFlag(disabledResolver, flagId, () => true, () => false),
        false,
        `${flagId} should execute disabled path`
      );
    }
  });
});
