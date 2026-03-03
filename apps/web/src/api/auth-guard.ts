/**
 * API auth guard module (ST-08-04)
 *
 * Provides route-level authentication, scope enforcement, and replay protection
 * for critical API handlers (usage-consume, entitlement-read, payment-webhook).
 *
 * Design:
 *   - Extract bearer token from Authorization header
 *   - Verify token via pluggable verifier (Clerk JWT in prod)
 *   - Enforce required scopes per route
 *   - Optional request-ID dedup for replay protection
 */

// --- Auth context ---

export type Scope = "usage:consume" | "entitlement:read" | "webhook:polar" | "admin";

export interface AuthContext {
  userId: string;
  scopes: Scope[];
  tokenIssuedAt: number;
}

// --- Token verification ---

export interface TokenVerifier {
  /** Verify a bearer token and return the auth context. Throw on invalid/expired. */
  verify(token: string): Promise<AuthContext>;
}

// --- Auth errors ---

export type AuthErrorCode =
  | "missing_authorization"
  | "invalid_token"
  | "insufficient_scope"
  | "replay_detected"
  | "token_expired";

export class ApiAuthError extends Error {
  readonly code: AuthErrorCode;
  readonly httpStatus: number;

  constructor(code: AuthErrorCode, message: string, httpStatus = 401) {
    super(message);
    this.name = "ApiAuthError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// --- Bearer token extraction ---

export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new ApiAuthError("missing_authorization", "Authorization header is required");
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!match || !match[1]) {
    throw new ApiAuthError("invalid_token", "Authorization header must use Bearer scheme");
  }

  return match[1];
}

// --- Scope check ---

export function assertScopes(context: AuthContext, required: Scope[]): void {
  const hasAdmin = context.scopes.includes("admin");
  if (hasAdmin) return;

  for (const scope of required) {
    if (!context.scopes.includes(scope)) {
      throw new ApiAuthError(
        "insufficient_scope",
        `Missing required scope: ${scope}`,
        403
      );
    }
  }
}

// --- Replay protection ---

export interface ReplayGuard {
  /** Returns true if the requestId was already seen (= replay). */
  check(requestId: string): boolean;
}

/**
 * In-memory replay guard with a sliding window.
 * Keeps track of seen request IDs for a configurable TTL.
 */
export class InMemoryReplayGuard implements ReplayGuard {
  private seen = new Map<string, number>();
  private readonly ttlMs: number;
  private readonly maxSize: number;
  private readonly now: () => number;

  constructor(options: { ttlMs?: number; maxSize?: number; now?: () => number } = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // 5 min
    this.maxSize = options.maxSize ?? 10_000;
    this.now = options.now ?? (() => Date.now());
  }

  check(requestId: string): boolean {
    this.prune();

    if (this.seen.has(requestId)) {
      return true; // replay
    }

    this.seen.set(requestId, this.now());
    return false;
  }

  get size(): number {
    return this.seen.size;
  }

  private prune(): void {
    if (this.seen.size <= this.maxSize) return;
    const cutoff = this.now() - this.ttlMs;
    for (const [id, ts] of this.seen) {
      if (ts < cutoff) {
        this.seen.delete(id);
      }
    }
  }
}

// --- Guarded handler wrapper ---

export interface GuardedRequest {
  headers?: Record<string, string | undefined>;
  body?: unknown;
  query?: Record<string, string | undefined>;
}

export interface GuardedResponse {
  status: number;
  body: unknown;
}

export interface GuardOptions {
  /** Token verifier (required) */
  verifier: TokenVerifier;
  /** Scopes required for this route */
  requiredScopes?: Scope[];
  /** Replay guard instance (optional) */
  replayGuard?: ReplayGuard;
  /** Header name for request-ID (default: "x-request-id") */
  requestIdHeader?: string;
}

/**
 * Wrap an API handler with auth guard.
 * Extracts bearer token, verifies, checks scopes, and optionally checks replay.
 */
export function withAuthGuard<
  TReq extends GuardedRequest,
  TRes extends GuardedResponse
>(
  handler: (request: TReq, authContext: AuthContext) => Promise<TRes>,
  options: GuardOptions
): (request: TReq) => Promise<TRes | GuardedResponse> {
  return async (request: TReq) => {
    const authHeader = request.headers?.authorization ?? request.headers?.Authorization;

    try {
      const token = extractBearerToken(authHeader);
      const ctx = await options.verifier.verify(token);

      if (options.requiredScopes && options.requiredScopes.length > 0) {
        assertScopes(ctx, options.requiredScopes);
      }

      if (options.replayGuard) {
        const requestIdHeaderName = options.requestIdHeader ?? "x-request-id";
        const requestId = request.headers?.[requestIdHeaderName];
        if (requestId && options.replayGuard.check(requestId)) {
          throw new ApiAuthError("replay_detected", "Duplicate request ID detected", 409);
        }
      }

      return handler(request, ctx);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        return {
          status: err.httpStatus,
          body: {
            error: err.code,
            message: err.message
          }
        } as GuardedResponse;
      }
      throw err;
    }
  };
}

// --- Mock verifier for testing ---

export function createMockVerifier(config: {
  validTokens?: Map<string, AuthContext>;
  defaultContext?: AuthContext;
} = {}): TokenVerifier {
  return {
    async verify(token: string): Promise<AuthContext> {
      if (config.validTokens?.has(token)) {
        return config.validTokens.get(token)!;
      }
      if (config.defaultContext) {
        return config.defaultContext;
      }
      throw new ApiAuthError("invalid_token", "Token verification failed");
    }
  };
}
