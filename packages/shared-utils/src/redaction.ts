/**
 * Data classification and redaction utilities (ST-08-01)
 *
 * Classification levels:
 *   public     — safe to log/telemetry (e.g., modelFamily, outputFormat)
 *   internal   — ok in structured logs, never in telemetry (e.g., userId hash)
 *   restricted — never logged (e.g., prompt text, code snippets)
 *   secret     — never logged, never stored outside SecretStorage (e.g., API keys)
 */

// --- Classification ---

export type DataClassification = "public" | "internal" | "restricted" | "secret";

/**
 * Fields that MUST be redacted when present in any log/telemetry payload.
 * Uses a deny-list approach: if the key matches, it's redacted regardless of context.
 */
const SECRET_FIELD_PATTERNS: RegExp[] = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /authorization/i,
  /bearer/i,
  /credential/i,
  /private[_-]?key/i,
  /signing[_-]?key/i,
  /service[_-]?role/i
];

const RESTRICTED_FIELD_PATTERNS: RegExp[] = [
  /prompt/i,
  /code[_-]?snippet/i,
  /source[_-]?code/i,
  /file[_-]?content/i,
  /selection/i,
  /body/i,
  /optimized/i,
  /input[_-]?text/i,
  /user[_-]?content/i
];

export function classifyField(fieldName: string): DataClassification {
  if (SECRET_FIELD_PATTERNS.some((p) => p.test(fieldName))) return "secret";
  if (RESTRICTED_FIELD_PATTERNS.some((p) => p.test(fieldName))) return "restricted";
  return "public";
}

// --- Value redaction ---

const REDACTED = "[REDACTED]";
const REDACTED_SECRET = "[REDACTED_SECRET]";

/**
 * Redact a string value that contains a potential API key pattern.
 * Common patterns: sk-..., key-..., gsk_..., Bearer ..., long hex strings.
 */
const API_KEY_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /key-[a-zA-Z0-9]{20,}/g,
  /gsk_[a-zA-Z0-9]{20,}/g,
  /AIza[a-zA-Z0-9_-]{30,}/g,
  /Bearer\s+[a-zA-Z0-9._\-/+=]{20,}/gi,
  /[a-f0-9]{32,}/gi
];

export function redactSecretPatterns(value: string): string {
  let result = value;
  for (const pattern of API_KEY_PATTERNS) {
    result = result.replace(pattern, REDACTED_SECRET);
  }
  return result;
}

// --- Payload redaction ---

export interface RedactOptions {
  /** Additional field names to always redact */
  additionalSecretFields?: string[];
  /** Additional field names to treat as restricted */
  additionalRestrictedFields?: string[];
  /** Maximum depth for nested object traversal */
  maxDepth?: number;
}

/**
 * Deep-redact an object payload for safe logging/telemetry.
 * - secret fields → "[REDACTED_SECRET]"
 * - restricted fields → "[REDACTED]"
 * - string values are also scanned for API key patterns
 */
export function redactPayload(
  payload: unknown,
  options: RedactOptions = {}
): unknown {
  const maxDepth = options.maxDepth ?? 10;
  const extraSecrets = new Set(options.additionalSecretFields?.map((f) => f.toLowerCase()) ?? []);
  const extraRestricted = new Set(options.additionalRestrictedFields?.map((f) => f.toLowerCase()) ?? []);

  return redactValue(payload, "", 0, maxDepth, extraSecrets, extraRestricted);
}

function redactValue(
  value: unknown,
  fieldName: string,
  depth: number,
  maxDepth: number,
  extraSecrets: Set<string>,
  extraRestricted: Set<string>
): unknown {
  // Field-level classification
  if (fieldName) {
    const lowerField = fieldName.toLowerCase();
    if (extraSecrets.has(lowerField) || classifyField(fieldName) === "secret") {
      return REDACTED_SECRET;
    }
    if (extraRestricted.has(lowerField) || classifyField(fieldName) === "restricted") {
      return REDACTED;
    }
  }

  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return redactSecretPatterns(value);
  }

  if (typeof value !== "object") return value;

  if (depth >= maxDepth) return REDACTED;

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, "", depth + 1, maxDepth, extraSecrets, extraRestricted));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    redacted[key] = redactValue(val, key, depth + 1, maxDepth, extraSecrets, extraRestricted);
  }
  return redacted;
}

// --- Safe logger wrapper ---

export interface SafeLoggerOptions extends RedactOptions {
  logger?: (level: string, message: string, data?: unknown) => void;
}

export function createSafeLogger(options: SafeLoggerOptions = {}) {
  const log = options.logger ?? ((_level: string, message: string, _data?: unknown) => {
    // no-op default
  });

  function info(message: string, data?: unknown): void {
    log("info", message, data ? redactPayload(data, options) : undefined);
  }

  function warn(message: string, data?: unknown): void {
    log("warn", message, data ? redactPayload(data, options) : undefined);
  }

  function error(message: string, data?: unknown): void {
    log("error", message, data ? redactPayload(data, options) : undefined);
  }

  function debug(message: string, data?: unknown): void {
    log("debug", message, data ? redactPayload(data, options) : undefined);
  }

  return { info, warn, error, debug };
}

export type SafeLogger = ReturnType<typeof createSafeLogger>;

// --- Leak detection (test utility) ---

/**
 * Scans a serialized output for known secret/restricted patterns.
 * Returns found leak indicators. Intended for use in test assertions.
 */
export function detectLeaks(serialized: string): string[] {
  const leaks: string[] = [];

  if (/sk-[a-zA-Z0-9]{20,}/.test(serialized)) leaks.push("openai_key_pattern");
  if (/key-[a-zA-Z0-9]{20,}/.test(serialized)) leaks.push("anthropic_key_pattern");
  if (/gsk_[a-zA-Z0-9]{20,}/.test(serialized)) leaks.push("groq_key_pattern");
  if (/AIza[a-zA-Z0-9_-]{30,}/.test(serialized)) leaks.push("gemini_key_pattern");
  if (/Bearer\s+[a-zA-Z0-9._\-/+=]{20,}/i.test(serialized)) leaks.push("bearer_token_pattern");

  return leaks;
}
