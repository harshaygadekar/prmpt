#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const WORKSPACE_DIRS = ["apps", "packages"];

function safeStat(pathname) {
  try {
    return statSync(pathname);
  } catch {
    return null;
  }
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, "utf8"));
}

function getManifests() {
  const manifests = [];

  for (const group of WORKSPACE_DIRS) {
    const groupDir = join(ROOT, group);
    const groupStat = safeStat(groupDir);
    if (!groupStat || !groupStat.isDirectory()) {
      continue;
    }

    const entries = readdirSync(groupDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const manifestPath = join(groupDir, entry.name, "package.json");
      const manifestStat = safeStat(manifestPath);
      if (!manifestStat || !manifestStat.isFile()) {
        continue;
      }

      const manifest = readJson(manifestPath);
      manifests.push({
        group,
        path: manifestPath,
        name: manifest.name,
        manifest
      });
    }
  }

  return manifests;
}

function collectDeps(manifest) {
  return {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies
  };
}

const manifests = getManifests();
const workspaceByName = new Map(manifests.map((item) => [item.name, item]));
const errors = [];

for (const item of manifests) {
  const deps = collectDeps(item.manifest);

  for (const depName of Object.keys(deps)) {
    const target = workspaceByName.get(depName);
    if (!target) {
      continue;
    }

    if (item.group === "packages" && target.group === "apps") {
      errors.push(
        `${relative(ROOT, item.path)} cannot depend on app package ${depName}`
      );
    }

    if (item.name === "@prmpt/contracts" && depName.startsWith("@prmpt/")) {
      errors.push(
        `${relative(ROOT, item.path)} must remain dependency-minimal and cannot depend on ${depName}`
      );
    }
  }
}

if (errors.length > 0) {
  console.error("Dependency direction check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Dependency direction check passed.");
