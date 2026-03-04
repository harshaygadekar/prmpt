#!/usr/bin/env bash
# rollback-vsix.sh — Rollback VS Code extension to a previous version
#
# Usage:
#   scripts/rollback-vsix.sh <target-version>
#
# Examples:
#   scripts/rollback-vsix.sh 0.1.0        # Rollback to v0.1.0
#   scripts/rollback-vsix.sh 0.1.0 --dry   # Dry-run (download only, don't publish)
#
# Prerequisites:
#   - gh CLI authenticated (gh auth status)
#   - VSCE_PAT env var set (for publish step)
#   - @vscode/vsce installed (npm install -g @vscode/vsce)
#
# ST-09-04: Extension Packaging, Publishing, and Rollback Automation

set -euo pipefail

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '')"
TARGET_VERSION="${1:-}"
DRY_RUN="${2:-}"

# ── Validation ──────────────────────────────────────

if [[ -z "$TARGET_VERSION" ]]; then
  echo "Error: Target version is required."
  echo "Usage: scripts/rollback-vsix.sh <target-version> [--dry]"
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo "Error: GitHub CLI (gh) is required. Install: https://cli.github.com/"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Error: GitHub CLI not authenticated. Run: gh auth login"
  exit 1
fi

if [[ -z "$REPO" ]]; then
  echo "Error: Could not detect repository. Run from inside the prmpt repo."
  exit 1
fi

TAG="v${TARGET_VERSION}"
VSIX_NAME="prmpt-${TARGET_VERSION}.vsix"
WORK_DIR="$(mktemp -d)"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║           Extension Rollback (ST-09-04)                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Repository:     ${REPO}"
echo "  Target version: ${TARGET_VERSION}"
echo "  Tag:            ${TAG}"
echo "  VSIX artifact:  ${VSIX_NAME}"
echo "  Work directory:  ${WORK_DIR}"
echo ""

# ── Step 1: Download VSIX from GitHub Release ──────

echo "→ Step 1: Downloading VSIX from release ${TAG}..."

if ! gh release view "$TAG" --repo "$REPO" &>/dev/null; then
  echo "Error: Release ${TAG} not found in ${REPO}."
  echo "Available releases:"
  gh release list --repo "$REPO" --limit 10
  rm -rf "$WORK_DIR"
  exit 1
fi

gh release download "$TAG" \
  --repo "$REPO" \
  --pattern "*.vsix" \
  --dir "$WORK_DIR"

DOWNLOADED="$(ls "${WORK_DIR}"/*.vsix 2>/dev/null | head -1)"
if [[ -z "$DOWNLOADED" ]]; then
  echo "Error: No VSIX artifact found in release ${TAG}."
  rm -rf "$WORK_DIR"
  exit 1
fi

echo "  Downloaded: $(basename "$DOWNLOADED") ($(stat -c%s "$DOWNLOADED" 2>/dev/null || stat -f%z "$DOWNLOADED") bytes)"

# ── Step 2: Validate VSIX integrity ────────────────

echo "→ Step 2: Validating VSIX artifact..."
if ! file "$DOWNLOADED" | grep -qi "zip"; then
  echo "Error: Downloaded file is not a valid VSIX (zip) archive."
  rm -rf "$WORK_DIR"
  exit 1
fi

# Check for expected content
if ! unzip -l "$DOWNLOADED" 2>/dev/null | grep -q "extension.vsixmanifest"; then
  echo "Warning: VSIX may be incomplete (no vsixmanifest found)."
fi

echo "  VSIX integrity: OK"

# ── Step 3: Publish (or dry-run) ────────────────────

if [[ "$DRY_RUN" == "--dry" ]]; then
  echo ""
  echo "→ DRY RUN: Skipping publish step."
  echo "  VSIX saved to: ${DOWNLOADED}"
  echo ""
  echo "  To publish manually:"
  echo "    vsce publish --packagePath '${DOWNLOADED}'"
  echo ""
  echo "  To install locally:"
  echo "    code --install-extension '${DOWNLOADED}'"
else
  echo "→ Step 3: Publishing ${TARGET_VERSION} to VS Code Marketplace..."

  if [[ -z "${VSCE_PAT:-}" ]]; then
    echo "Error: VSCE_PAT environment variable is required for publishing."
    echo "  Set it via: export VSCE_PAT=<your-personal-access-token>"
    echo ""
    echo "  VSIX saved to: ${DOWNLOADED}"
    echo "  To publish manually: vsce publish --packagePath '${DOWNLOADED}'"
    rm -rf "$WORK_DIR"
    exit 1
  fi

  if ! command -v vsce &>/dev/null; then
    echo "Error: vsce CLI not found. Install: npm install -g @vscode/vsce"
    rm -rf "$WORK_DIR"
    exit 1
  fi

  vsce publish --packagePath "$DOWNLOADED"

  echo ""
  echo "  ✅ Successfully published prmpt v${TARGET_VERSION} to Marketplace."
fi

# ── Step 4: Post-rollback verification checklist ────

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          Post-Rollback Verification Checklist           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  □ 1. Verify Marketplace listing shows v${TARGET_VERSION}"
echo "  □ 2. Install rolled-back version in VS Code"
echo "  □ 3. Test activation: Ctrl+Shift+P → 'prmpt'"
echo "  □ 4. Test sign-in flow completes"
echo "  □ 5. Test optimize command produces output"
echo "  □ 6. Check extension output channel for errors"
echo "  □ 7. Update incident log / status.md with rollback event"
echo ""

# ── Cleanup ─────────────────────────────────────────

if [[ "$DRY_RUN" != "--dry" ]]; then
  rm -rf "$WORK_DIR"
fi

echo "Done."
