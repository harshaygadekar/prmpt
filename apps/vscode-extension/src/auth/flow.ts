export type AuthMode = "sign-in" | "sign-up";

export interface BeginAuthInput {
  appBaseUrl: string;
  callbackUri: string;
  mode?: AuthMode;
  generateState?: () => string;
}

export interface PendingAuthRequest {
  mode: AuthMode;
  clientState: string;
  authUrl: string;
  callbackUri: string;
}

export interface ParsedAuthCallback {
  code: string | undefined;
  state: string | undefined;
  nonce: string | undefined;
  clientState: string | undefined;
  error: string | undefined;
}

export function beginAuthRequest(input: BeginAuthInput): PendingAuthRequest {
  const mode = input.mode ?? "sign-in";
  const clientState = (input.generateState ?? defaultStateFactory)();

  const authUrl = new URL(`/auth/${mode}`, input.appBaseUrl);
  authUrl.searchParams.set("callback_uri", input.callbackUri);
  authUrl.searchParams.set("client_state", clientState);

  return {
    mode,
    clientState,
    authUrl: authUrl.toString(),
    callbackUri: input.callbackUri
  };
}

export function parseAuthCallbackUri(uri: string): ParsedAuthCallback {
  const parsed = new URL(uri);

  return {
    code: parsed.searchParams.get("code") ?? undefined,
    state: parsed.searchParams.get("state") ?? undefined,
    nonce: parsed.searchParams.get("nonce") ?? undefined,
    clientState: parsed.searchParams.get("client_state") ?? undefined,
    error: parsed.searchParams.get("error") ?? undefined
  };
}

export function validateAuthCallback(
  callback: ParsedAuthCallback,
  pending: PendingAuthRequest
): { ok: true } {
  if (callback.error) {
    throw new Error(`Auth callback returned error: ${callback.error}`);
  }

  if (!callback.code) {
    throw new Error("Auth callback is missing authorization code.");
  }

  if (!callback.state) {
    throw new Error("Auth callback is missing state.");
  }

  if (!callback.nonce) {
    throw new Error("Auth callback is missing nonce.");
  }

  if (!callback.clientState) {
    throw new Error("Auth callback is missing client_state.");
  }

  if (callback.clientState !== pending.clientState) {
    throw new Error("Auth callback client_state mismatch.");
  }

  return { ok: true };
}

function defaultStateFactory(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `state_${Date.now().toString(36)}`;
}
