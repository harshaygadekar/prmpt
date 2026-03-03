import type {
  MessageEnvelope
} from "../messaging/index.js";
import { createResponse, MESSAGE_TYPES } from "../messaging/index.js";

// --- Provider key types ---

export type ProviderId = "openai" | "anthropic" | "gemini" | "openrouter" | "groq" | "ollama";

export type ProviderMode = "byok" | "local";

export interface ProviderKeyEntry {
  providerId: ProviderId;
  /** Masked display of key, e.g. "sk-...abc" */
  maskedKey: string;
  addedAt: number;
  lastVerified: number | undefined;
  healthy: boolean | undefined;
}

export interface ProviderHealthStatus {
  providerId: ProviderId;
  healthy: boolean;
  detail: string;
  checkedAt: number;
}

// --- Secret storage abstraction ---

export interface SecretStorageLike {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// --- Key mask utility ---

function maskApiKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

const STORAGE_PREFIX = "prmpt.provider.key.";
const METADATA_KEY = "prmpt.provider.metadata";

// --- Provider health checker ---

export interface HealthCheckFn {
  (providerId: ProviderId, apiKey: string): Promise<{ ok: boolean; detail?: string }>;
}

// --- Provider key manager ---

export class ProviderKeyManager {
  private secrets: SecretStorageLike;
  private metadata: Map<ProviderId, Omit<ProviderKeyEntry, "providerId">> = new Map();
  private healthCheck: HealthCheckFn | undefined;

  constructor(secrets: SecretStorageLike, healthCheck?: HealthCheckFn) {
    this.secrets = secrets;
    this.healthCheck = healthCheck;
  }

  async loadMetadata(): Promise<void> {
    const raw = await this.secrets.get(METADATA_KEY);
    if (!raw) return;
    try {
      const entries = JSON.parse(raw) as Array<{ providerId: ProviderId } & Omit<ProviderKeyEntry, "providerId">>;
      this.metadata.clear();
      for (const e of entries) {
        this.metadata.set(e.providerId, {
          maskedKey: e.maskedKey,
          addedAt: e.addedAt,
          lastVerified: e.lastVerified,
          healthy: e.healthy
        });
      }
    } catch {
      // corrupted metadata, reset
      this.metadata.clear();
    }
  }

  private async saveMetadata(): Promise<void> {
    const entries = [...this.metadata.entries()].map(([providerId, entry]) => ({
      providerId,
      ...entry
    }));
    await this.secrets.store(METADATA_KEY, JSON.stringify(entries));
  }

  async addKey(providerId: ProviderId, apiKey: string): Promise<ProviderKeyEntry> {
    await this.secrets.store(`${STORAGE_PREFIX}${providerId}`, apiKey);

    const entry: Omit<ProviderKeyEntry, "providerId"> = {
      maskedKey: maskApiKey(apiKey),
      addedAt: Date.now(),
      lastVerified: undefined,
      healthy: undefined
    };
    this.metadata.set(providerId, entry);
    await this.saveMetadata();

    return { providerId, ...entry };
  }

  async updateKey(providerId: ProviderId, apiKey: string): Promise<ProviderKeyEntry> {
    return this.addKey(providerId, apiKey);
  }

  async removeKey(providerId: ProviderId): Promise<void> {
    await this.secrets.delete(`${STORAGE_PREFIX}${providerId}`);
    this.metadata.delete(providerId);
    await this.saveMetadata();
  }

  async getKey(providerId: ProviderId): Promise<string | undefined> {
    return this.secrets.get(`${STORAGE_PREFIX}${providerId}`);
  }

  hasKey(providerId: ProviderId): boolean {
    return this.metadata.has(providerId);
  }

  listKeys(): ProviderKeyEntry[] {
    return [...this.metadata.entries()].map(([providerId, entry]) => ({
      providerId,
      ...entry
    }));
  }

  async checkHealth(providerId: ProviderId): Promise<ProviderHealthStatus> {
    if (!this.healthCheck) {
      return {
        providerId,
        healthy: false,
        detail: "No health check function configured",
        checkedAt: Date.now()
      };
    }

    const apiKey = await this.getKey(providerId);
    if (!apiKey) {
      return {
        providerId,
        healthy: false,
        detail: "No API key configured",
        checkedAt: Date.now()
      };
    }

    try {
      const result = await this.healthCheck(providerId, apiKey);
      const now = Date.now();
      const meta = this.metadata.get(providerId);
      if (meta) {
        meta.healthy = result.ok;
        meta.lastVerified = now;
        await this.saveMetadata();
      }

      return {
        providerId,
        healthy: result.ok,
        detail: result.detail ?? (result.ok ? "Healthy" : "Health check failed"),
        checkedAt: now
      };
    } catch (err) {
      const now = Date.now();
      const meta = this.metadata.get(providerId);
      if (meta) {
        meta.healthy = false;
        meta.lastVerified = now;
        await this.saveMetadata();
      }

      return {
        providerId,
        healthy: false,
        detail: err instanceof Error ? err.message : String(err),
        checkedAt: now
      };
    }
  }

  async checkAllHealth(): Promise<ProviderHealthStatus[]> {
    const results: ProviderHealthStatus[] = [];
    for (const [providerId] of this.metadata) {
      results.push(await this.checkHealth(providerId));
    }
    return results;
  }
}

// --- Mode manager ---

export interface ModeManagerDeps {
  checkEntitlement: () => Promise<{ tier: "free" | "premium" }>;
}

export class ProviderModeManager {
  private currentMode: ProviderMode = "byok";
  private deps: ModeManagerDeps;

  constructor(deps: ModeManagerDeps) {
    this.deps = deps;
  }

  getMode(): ProviderMode {
    return this.currentMode;
  }

  async switchMode(targetMode: ProviderMode): Promise<{ success: boolean; error?: string }> {
    if (targetMode === "local") {
      // Local mode requires premium entitlement
      try {
        const ent = await this.deps.checkEntitlement();
        if (ent.tier !== "premium") {
          return {
            success: false,
            error: "Local premium mode requires a premium subscription."
          };
        }
      } catch {
        return {
          success: false,
          error: "Could not verify entitlement. Please try again."
        };
      }
    }

    this.currentMode = targetMode;
    return { success: true };
  }
}

// --- Message handler factories ---

export function createSettingsGetHandler(
  keyManager: ProviderKeyManager,
  modeManager: ProviderModeManager
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    return createResponse(
      MESSAGE_TYPES.SETTINGS_GET_RESPONSE,
      {
        mode: modeManager.getMode(),
        providers: keyManager.listKeys()
      },
      envelope.correlationId
    );
  };
}

export function createSettingsUpdateHandler(
  keyManager: ProviderKeyManager,
  modeManager: ProviderModeManager
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    const payload = envelope.payload as Record<string, unknown>;
    const action = payload?.action as string;

    switch (action) {
      case "add-key": {
        const providerId = payload.providerId as ProviderId;
        const apiKey = payload.apiKey as string;
        if (!providerId || !apiKey) {
          return createResponse(
            MESSAGE_TYPES.SETTINGS_UPDATE_RESPONSE,
            { success: false, error: "providerId and apiKey are required" },
            envelope.correlationId
          );
        }
        const entry = await keyManager.addKey(providerId, apiKey);
        return createResponse(
          MESSAGE_TYPES.SETTINGS_UPDATE_RESPONSE,
          { success: true, action: "add-key", entry },
          envelope.correlationId
        );
      }

      case "remove-key": {
        const providerId = payload.providerId as ProviderId;
        if (!providerId) {
          return createResponse(
            MESSAGE_TYPES.SETTINGS_UPDATE_RESPONSE,
            { success: false, error: "providerId is required" },
            envelope.correlationId
          );
        }
        await keyManager.removeKey(providerId);
        return createResponse(
          MESSAGE_TYPES.SETTINGS_UPDATE_RESPONSE,
          { success: true, action: "remove-key", providerId },
          envelope.correlationId
        );
      }

      case "switch-mode": {
        const mode = payload.mode as ProviderMode;
        if (!mode) {
          return createResponse(
            MESSAGE_TYPES.SETTINGS_UPDATE_RESPONSE,
            { success: false, error: "mode is required" },
            envelope.correlationId
          );
        }
        const result = await modeManager.switchMode(mode);
        return createResponse(
          MESSAGE_TYPES.SETTINGS_UPDATE_RESPONSE,
          { success: result.success, action: "switch-mode", mode, error: result.error },
          envelope.correlationId
        );
      }

      default:
        return createResponse(
          MESSAGE_TYPES.SETTINGS_UPDATE_RESPONSE,
          { success: false, error: `Unknown settings action: ${action}` },
          envelope.correlationId
        );
    }
  };
}

export function createProviderStatusHandler(
  keyManager: ProviderKeyManager
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    const payload = envelope.payload as Record<string, unknown> | undefined;
    const providerId = payload?.providerId as ProviderId | undefined;

    if (providerId) {
      const status = await keyManager.checkHealth(providerId);
      return createResponse(
        MESSAGE_TYPES.PROVIDER_STATUS_RESPONSE,
        { providers: [status] },
        envelope.correlationId
      );
    }

    const allStatus = await keyManager.checkAllHealth();
    return createResponse(
      MESSAGE_TYPES.PROVIDER_STATUS_RESPONSE,
      { providers: allStatus },
      envelope.correlationId
    );
  };
}
