#!/usr/bin/env bash
set -euo pipefail

EXPECTED_NODE="v22.21.1"
EXPECTED_PNPM="10.15.0"

pass() { echo "[PASS] $1"; }
warn() { echo "[WARN] $1"; }
fail() { echo "[FAIL] $1"; }

check_cmd() {
  local cmd="$1"
  local label="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    pass "$label is installed"
  else
    fail "$label is not installed"
  fi
}

echo "Gate B machine validation"
echo "-------------------------"

# B1 Node baseline
if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node -v)"
  if [[ "$NODE_VERSION" == "$EXPECTED_NODE" ]]; then
    pass "Node version locked: $NODE_VERSION"
  else
    warn "Node version mismatch. expected=$EXPECTED_NODE actual=$NODE_VERSION"
  fi
else
  fail "Node is not installed"
fi

# B2 pnpm baseline
if command -v pnpm >/dev/null 2>&1; then
  PNPM_VERSION="$(pnpm -v)"
  if [[ "$PNPM_VERSION" == "$EXPECTED_PNPM" ]]; then
    pass "pnpm version locked: $PNPM_VERSION"
  else
    warn "pnpm version mismatch. expected=$EXPECTED_PNPM actual=$PNPM_VERSION"
  fi
else
  fail "pnpm is not installed"
fi

# B3 VS Code extension development prerequisites
check_cmd "code" "VS Code CLI"
check_cmd "git" "git"
check_cmd "python3" "python3"
check_cmd "make" "make"
check_cmd "gcc" "gcc"

if command -v code >/dev/null 2>&1; then
  if code --version >/dev/null 2>&1; then
    pass "VS Code CLI is runnable"
  else
    warn "VS Code CLI found but failed to run. If using snap, validate snapd/apparmor config."
  fi
fi

# B4/B5 Ollama install and local model
if command -v ollama >/dev/null 2>&1; then
  if ollama list >/tmp/prmpt_ollama_list.txt 2>/dev/null; then
    pass "Ollama is reachable"
    if awk 'NR>1 && $1 !~ /:cloud$/ {found=1} END {exit(found?0:1)}' /tmp/prmpt_ollama_list.txt; then
      pass "At least one local Ollama model is available"
    else
      warn "No local Ollama model found. Run: ollama pull llama3.2:3b"
    fi
  else
    warn "Ollama installed but daemon not reachable. Start service and rerun."
  fi
else
  fail "Ollama is not installed"
fi

# B6 BYOK keys
if [[ -f ".env.local" ]]; then
  MISSING=0
  for key in OPENAI_API_KEY ANTHROPIC_API_KEY GEMINI_API_KEY OPENROUTER_API_KEY GROQ_API_KEY; do
    if grep -Eq "^${key}=.+$" .env.local; then
      pass "$key present in .env.local (non-empty)"
    else
      warn "$key missing or empty in .env.local"
      MISSING=1
    fi
  done
  if [[ "$MISSING" -eq 0 ]]; then
    pass "BYOK key provisioning baseline complete"
  else
    warn "BYOK baseline incomplete (at minimum OpenAI + one alternate provider required)"
  fi
else
  warn ".env.local not found (BYOK validation skipped)"
fi

# B7/B8 env and secret naming
if [[ -f ".env.example" ]]; then
  pass ".env.example exists"
else
  fail ".env.example missing"
fi

echo "-------------------------"
echo "Runbook reference: wiki/planning/local-dev-environment-baseline.md"
