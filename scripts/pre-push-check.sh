#!/usr/bin/env bash
set -euo pipefail

echo "Pre-push quality checks"
echo "-----------------------"

pnpm run build
pnpm run typecheck
pnpm run lint
pnpm run test

echo "-----------------------"
echo "All pre-push checks passed."
