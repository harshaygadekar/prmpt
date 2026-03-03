import { beginAuthRequest, parseAuthCallbackUri, type AuthMode, type PendingAuthRequest } from "./flow.js";
import { type AuthSession, type AuthSessionStore } from "./session.js";
import { validateAuthCallback } from "./flow.js";

const DEFAULT_OFFLINE_GRACE_MS = 24 * 60 * 60 * 1000;

export interface ExtensionAuthServiceOptions {
  appBaseUrl: string;
  callbackUri: string;
  sessionStore: AuthSessionStore;
  offlineGraceMs?: number;
  now?: () => number;
  generateState?: () => string;
}

export interface StartAuthOptions {
  mode?: AuthMode;
  openExternal: (url: string) => Promise<boolean>;
}

export class ExtensionAuthService {
  private readonly appBaseUrl: string;
  private readonly callbackUri: string;
  private readonly sessionStore: AuthSessionStore;
  private readonly offlineGraceMs: number;
  private readonly now: () => number;
  private readonly generateState: (() => string) | undefined;
  private pendingRequest: PendingAuthRequest | undefined;

  constructor(options: ExtensionAuthServiceOptions) {
    this.appBaseUrl = options.appBaseUrl;
    this.callbackUri = options.callbackUri;
    this.sessionStore = options.sessionStore;
    this.offlineGraceMs = options.offlineGraceMs ?? DEFAULT_OFFLINE_GRACE_MS;
    this.now = options.now ?? (() => Date.now());
    this.generateState = options.generateState;
  }

  async startAuth(options: StartAuthOptions): Promise<PendingAuthRequest> {
    const pending = beginAuthRequest({
      appBaseUrl: this.appBaseUrl,
      callbackUri: this.callbackUri,
      ...(options.mode ? { mode: options.mode } : {}),
      ...(this.generateState ? { generateState: this.generateState } : {})
    });

    this.pendingRequest = pending;
    await options.openExternal(pending.authUrl);
    return pending;
  }

  async handleCallbackUri(uri: string): Promise<AuthSession> {
    if (!this.pendingRequest) {
      throw new Error("No pending auth request. Start sign-in before handling callback.");
    }

    const callback = parseAuthCallbackUri(uri);
    validateAuthCallback(callback, this.pendingRequest);

    const issuedAt = this.now();
    const session: AuthSession = {
      code: callback.code as string,
      state: callback.state as string,
      nonce: callback.nonce as string,
      clientState: callback.clientState as string,
      issuedAt,
      expiresAt: issuedAt + this.offlineGraceMs
    };

    await this.sessionStore.writeSession(session);
    this.pendingRequest = undefined;
    return session;
  }

  async getStoredSession(): Promise<AuthSession | undefined> {
    return this.sessionStore.readSession();
  }

  async getSessionState() {
    return this.sessionStore.getSessionStatus(this.now());
  }

  async signOut(): Promise<void> {
    await this.sessionStore.clearSession();
    this.pendingRequest = undefined;
  }
}
