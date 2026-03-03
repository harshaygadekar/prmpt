import type { WebEnv } from "../env.js";
import {
  AuthStateError,
  InMemoryAuthStateStore,
  type AuthMode,
  type AuthStateStore,
  type AuthStateToken
} from "./state.js";

export interface AuthRequest {
  path: string;
  query: Record<string, string | undefined>;
}

export interface AuthResponse {
  status: 200 | 302 | 400;
  body?: string;
  redirectUrl?: string;
}

export interface AuthPortalRouter {
  handleRequest(request: AuthRequest): AuthResponse;
}

export interface AuthPortalRouterOptions {
  env: Pick<WebEnv, "appBaseUrl" | "clerkSignInUrl" | "clerkSignUpUrl">;
  stateStore?: AuthStateStore;
}

export function createAuthPortalRouter(options: AuthPortalRouterOptions): AuthPortalRouter {
  const stateStore = options.stateStore ?? new InMemoryAuthStateStore();

  return {
    handleRequest(request) {
      if (request.path === "/auth/sign-in") {
        return handleAuthStart("sign-in", request.query, options.env, stateStore);
      }

      if (request.path === "/auth/sign-up") {
        return handleAuthStart("sign-up", request.query, options.env, stateStore);
      }

      if (request.path === "/api/v1/auth/callback") {
        return handleAuthCallback(request.query, stateStore);
      }

      return {
        status: 400,
        body: `Unsupported auth route: ${request.path}`
      };
    }
  };
}

function handleAuthStart(
  mode: AuthMode,
  query: Record<string, string | undefined>,
  env: Pick<WebEnv, "appBaseUrl" | "clerkSignInUrl" | "clerkSignUpUrl">,
  stateStore: AuthStateStore
): AuthResponse {
  const callbackUri = query.callback_uri;
  const clientState = query.client_state;
  if (!callbackUri) {
    return {
      status: 400,
      body: "callback_uri query param is required"
    };
  }

  try {
    const token = stateStore.issue(mode, callbackUri, clientState);
    const redirectUrl = buildClerkRedirect(mode, env, token);

    return {
      status: 302,
      redirectUrl
    };
  } catch (error) {
    if (error instanceof AuthStateError) {
      return {
        status: 400,
        body: error.message
      };
    }

    throw error;
  }
}

function handleAuthCallback(
  query: Record<string, string | undefined>,
  stateStore: AuthStateStore
): AuthResponse {
  const state = query.state;
  const nonce = query.nonce;
  const code = query.code;

  if (!state || !nonce) {
    return {
      status: 400,
      body: "state and nonce are required"
    };
  }

  let token: AuthStateToken;
  try {
    token = stateStore.consume(state, nonce);
  } catch (error) {
    if (error instanceof AuthStateError) {
      return {
        status: 400,
        body: error.message
      };
    }

    throw error;
  }

  if (!code) {
    return {
      status: 400,
      body: "authorization code is required"
    };
  }

  const extensionRedirect = new URL(token.callbackUri);
  extensionRedirect.searchParams.set("state", state);
  extensionRedirect.searchParams.set("nonce", nonce);
  extensionRedirect.searchParams.set("code", code);
  if (token.clientState) {
    extensionRedirect.searchParams.set("client_state", token.clientState);
  }

  return {
    status: 302,
    redirectUrl: extensionRedirect.toString()
  };
}

function buildClerkRedirect(
  mode: AuthMode,
  env: Pick<WebEnv, "appBaseUrl" | "clerkSignInUrl" | "clerkSignUpUrl">,
  token: AuthStateToken
): string {
  const base = mode === "sign-in" ? env.clerkSignInUrl : env.clerkSignUpUrl;
  const redirect = new URL(base);

  redirect.searchParams.set("state", token.state);
  redirect.searchParams.set("nonce", token.nonce);
  redirect.searchParams.set("redirect_url", `${env.appBaseUrl}/api/v1/auth/callback`);

  return redirect.toString();
}
