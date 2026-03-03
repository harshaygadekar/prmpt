export const AUTH_SESSION_SECRET_KEY = "prmpt.auth.session.v1";

export interface AuthSession {
  code: string;
  state: string;
  nonce: string;
  clientState: string;
  issuedAt: number;
  expiresAt: number;
}

export interface AuthSessionStatus {
  state: "missing" | "valid" | "expired";
  session: AuthSession | undefined;
}

export interface SecretStorageLike {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AuthSessionStore {
  readSession(): Promise<AuthSession | undefined>;
  writeSession(session: AuthSession): Promise<void>;
  clearSession(): Promise<void>;
  getSessionStatus(now?: number): Promise<AuthSessionStatus>;
}

export class SecretStorageAuthSessionStore implements AuthSessionStore {
  private readonly storage: SecretStorageLike;
  private readonly secretKey: string;

  constructor(storage: SecretStorageLike, secretKey = AUTH_SESSION_SECRET_KEY) {
    this.storage = storage;
    this.secretKey = secretKey;
  }

  async readSession(): Promise<AuthSession | undefined> {
    const raw = await this.storage.get(this.secretKey);
    if (!raw) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthSession>;
      if (!isAuthSession(parsed)) {
        return undefined;
      }
      return parsed;
    } catch {
      return undefined;
    }
  }

  async writeSession(session: AuthSession): Promise<void> {
    await this.storage.store(this.secretKey, JSON.stringify(session));
  }

  async clearSession(): Promise<void> {
    await this.storage.delete(this.secretKey);
  }

  async getSessionStatus(now = Date.now()): Promise<AuthSessionStatus> {
    const session = await this.readSession();
    if (!session) {
      return { state: "missing", session: undefined };
    }

    if (session.expiresAt <= now) {
      return { state: "expired", session };
    }

    return { state: "valid", session };
  }
}

function isAuthSession(value: Partial<AuthSession>): value is AuthSession {
  return (
    typeof value.code === "string" &&
    typeof value.state === "string" &&
    typeof value.nonce === "string" &&
    typeof value.clientState === "string" &&
    typeof value.issuedAt === "number" &&
    typeof value.expiresAt === "number"
  );
}
