#!/usr/bin/env bash
set -euo pipefail

HOOK_FILE=".git/hooks/pre-push"

cat > "$HOOK_FILE" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail

bash scripts/pre-push-check.sh
HOOK

chmod +x "$HOOK_FILE"
echo "Installed pre-push hook at $HOOK_FILE"
