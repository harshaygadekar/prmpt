export type AuthMode = "sign-in" | "sign-up";

export interface AuthStateToken {
  state: string;
  nonce: string;
  callbackUri: string;
  clientState: string | undefined;
  mode: AuthMode;
  issuedAt: number;
  expiresAt: number;
}

export interface AuthStateStore {
  issue(mode: AuthMode, callbackUri: string, clientState?: string): AuthStateToken;
  consume(state: string, nonce: string): AuthStateToken;
}

export type AuthStateErrorCode =
  | "invalid_callback_uri"
  | "invalid_state"
  | "invalid_nonce"
  | "expired_state";

export class AuthStateError extends Error {
  readonly code: AuthStateErrorCode;

  constructor(code: AuthStateErrorCode, message: string) {
    super(message);
    this.name = "AuthStateError";
    this.code = code;
  }
}

interface InMemoryStateStoreOptions {
  ttlMs?: number;
  now?: () => number;
  generateState?: () => string;
  generateNonce?: () => string;
}

export class InMemoryAuthStateStore implements AuthStateStore {
  private readonly tokens = new Map<string, AuthStateToken>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly generateState: () => string;
  private readonly generateNonce: () => string;

  constructor(options: InMemoryStateStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? 10 * 60 * 1000;
    this.now = options.now ?? (() => Date.now());
    this.generateState = options.generateState ?? defaultIdFactory;
    this.generateNonce = options.generateNonce ?? defaultIdFactory;
  }

  issue(mode: AuthMode, callbackUri: string, clientState?: string): AuthStateToken {
    if (!isVsCodeCallbackUri(callbackUri)) {
      throw new AuthStateError(
        "invalid_callback_uri",
        `Callback URI must use vscode:// scheme. received=${callbackUri}`
      );
    }

    const issuedAt = this.now();
    const token: AuthStateToken = {
      state: this.generateState(),
      nonce: this.generateNonce(),
      callbackUri,
      clientState,
      mode,
      issuedAt,
      expiresAt: issuedAt + this.ttlMs
    };

    this.tokens.set(token.state, token);
    this.pruneExpired(issuedAt);

    return token;
  }

  consume(state: string, nonce: string): AuthStateToken {
    const token = this.tokens.get(state);
    if (!token) {
      throw new AuthStateError("invalid_state", "Callback state is unknown.");
    }

    this.tokens.delete(state);

    if (token.expiresAt < this.now()) {
      throw new AuthStateError("expired_state", "Callback state has expired.");
    }

    if (token.nonce !== nonce) {
      throw new AuthStateError("invalid_nonce", "Callback nonce does not match.");
    }

    return token;
  }

  private pruneExpired(referenceTs: number): void {
    for (const [key, token] of this.tokens.entries()) {
      if (token.expiresAt < referenceTs) {
        this.tokens.delete(key);
      }
    }
  }
}

export function isVsCodeCallbackUri(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "vscode:";
  } catch {
    return false;
  }
}

function defaultIdFactory(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `id_${Date.now().toString(36)}`;
}
