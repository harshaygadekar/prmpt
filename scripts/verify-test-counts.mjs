#!/usr/bin/env node

/**
 * Test count verification (ST-09-01)
 *
 * Runs all workspace tests and verifies each package meets its minimum
 * test count threshold. Exits non-zero if any package is below threshold.
 *
 * Usage: node scripts/verify-test-counts.mjs
 */

import { execSync } from "node:child_process";

// Minimum test count thresholds per package
const THRESHOLDS = {
  "@prmpt/contracts": 7,
  "@prmpt/shared-utils": 25,
  "@prmpt/model-rules": 9,
  "@prmpt/data-access": 25,
  "@prmpt/telemetry": 15,
  "@prmpt/provider-adapters": 25,
  "@prmpt/core-engine": 20,
  "@prmpt/template-schema": 50,
  "@prmpt/web": 70,
  "@prmpt/vscode-extension": 150
};

// Package directories
const PACKAGES = [
  { name: "@prmpt/contracts", dir: "packages/contracts" },
  { name: "@prmpt/shared-utils", dir: "packages/shared-utils" },
  { name: "@prmpt/model-rules", dir: "packages/model-rules" },
  { name: "@prmpt/data-access", dir: "packages/data-access" },
  { name: "@prmpt/telemetry", dir: "packages/telemetry" },
  { name: "@prmpt/provider-adapters", dir: "packages/provider-adapters" },
  { name: "@prmpt/core-engine", dir: "packages/core-engine" },
  { name: "@prmpt/template-schema", dir: "packages/template-schema" },
  { name: "@prmpt/web", dir: "apps/web" },
  { name: "@prmpt/vscode-extension", dir: "apps/vscode-extension" }
];

function getTestCount(dir) {
  try {
    const output = execSync(
      `node --test ${dir}/test/**/*.test.mjs 2>&1`,
      { encoding: "utf8", timeout: 60_000 }
    );
    // Parse "pass N" from node:test output
    const passMatch = output.match(/pass\s+(\d+)/i);
    const failMatch = output.match(/fail\s+(\d+)/i);
    const pass = passMatch ? parseInt(passMatch[1], 10) : 0;
    const fail = failMatch ? parseInt(failMatch[1], 10) : 0;
    return { pass, fail, total: pass + fail, error: null };
  } catch (err) {
    // node --test exits non-zero if tests fail
    const output = err.stdout ?? err.stderr ?? "";
    const passMatch = output.match(/pass\s+(\d+)/i);
    const failMatch = output.match(/fail\s+(\d+)/i);
    const pass = passMatch ? parseInt(passMatch[1], 10) : 0;
    const fail = failMatch ? parseInt(failMatch[1], 10) : 0;
    if (pass > 0 || fail > 0) {
      return { pass, fail, total: pass + fail, error: null };
    }
    return { pass: 0, fail: 0, total: 0, error: output.slice(0, 200) };
  }
}

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║           Test Count Verification (ST-09-01)           ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

let allPassed = true;
const results = [];

for (const pkg of PACKAGES) {
  const threshold = THRESHOLDS[pkg.name] ?? 0;
  const counts = getTestCount(pkg.dir);

  const status = counts.error
    ? "ERROR"
    : counts.fail > 0
      ? "FAIL"
      : counts.pass >= threshold
        ? "OK"
        : "BELOW";

  if (status !== "OK") {
    allPassed = false;
  }

  results.push({
    name: pkg.name,
    pass: counts.pass,
    fail: counts.fail,
    threshold,
    status,
    error: counts.error
  });
}

// Print results table
console.log("Package                       Pass  Fail  Threshold  Status");
console.log("─".repeat(65));
for (const r of results) {
  const name = r.name.padEnd(30);
  const pass = String(r.pass).padStart(4);
  const fail = String(r.fail).padStart(4);
  const thresh = String(r.threshold).padStart(9);
  const icon = r.status === "OK" ? "✅" : r.status === "BELOW" ? "⚠️ " : "❌";
  console.log(`${name}${pass}  ${fail}  ${thresh}  ${icon} ${r.status}`);
  if (r.error) {
    console.log(`  └─ ${r.error}`);
  }
}

const totalPass = results.reduce((s, r) => s + r.pass, 0);
const totalFail = results.reduce((s, r) => s + r.fail, 0);
console.log("─".repeat(65));
console.log(`Total: ${totalPass} pass, ${totalFail} fail\n`);

if (!allPassed) {
  console.error("❌ Test count verification FAILED — see results above.");
  process.exit(1);
} else {
  console.log("✅ All packages meet minimum test count thresholds.");
}
