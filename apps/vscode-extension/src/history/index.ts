import type { MessageEnvelope } from "../messaging/index.js";
import { createResponse, MESSAGE_TYPES } from "../messaging/index.js";

// --- History types ---

export interface HistoryEntry {
  id: string;
  inputPrompt: string;
  optimizedPrompt: string;
  modelFamily: string;
  outputFormat: string;
  provider: string;
  score: number | undefined;
  templateId: string | undefined;
  createdAt: string;
}

export interface HistoryListResult {
  entries: HistoryEntry[];
  total: number;
}

// --- Remote history client ---

export interface HistoryClientConfig {
  baseUrl: string;
  fetchFn?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export function createHistoryClient(config: HistoryClientConfig) {
  const baseUrl = config.baseUrl.endsWith("/") ? config.baseUrl.slice(0, -1) : config.baseUrl;
  const fetchFn = config.fetchFn ?? globalThis.fetch;
  const timeoutMs = config.timeoutMs ?? 10_000;

  async function list(
    userId: string,
    options: { limit?: number; offset?: number; search?: string } = {}
  ): Promise<HistoryListResult> {
    const url = new URL(`${baseUrl}/api/v1/history`);
    url.searchParams.set("userId", userId);
    if (options.limit !== undefined) url.searchParams.set("limit", String(options.limit));
    if (options.offset !== undefined) url.searchParams.set("offset", String(options.offset));
    if (options.search) url.searchParams.set("search", options.search);

    const response = await timedFetch(fetchFn, url.toString(), { method: "GET" }, timeoutMs);
    if (!response.ok) {
      throw new Error(`History list failed: status=${response.status}`);
    }
    return (await response.json()) as HistoryListResult;
  }

  async function get(userId: string, entryId: string): Promise<HistoryEntry | undefined> {
    const url = new URL(`${baseUrl}/api/v1/history/${entryId}`);
    url.searchParams.set("userId", userId);

    const response = await timedFetch(fetchFn, url.toString(), { method: "GET" }, timeoutMs);
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`History get failed: status=${response.status}`);
    }
    return (await response.json()) as HistoryEntry;
  }

  async function remove(userId: string, entryId: string): Promise<boolean> {
    const url = new URL(`${baseUrl}/api/v1/history/${entryId}`);
    url.searchParams.set("userId", userId);

    const response = await timedFetch(
      fetchFn,
      url.toString(),
      { method: "DELETE" },
      timeoutMs
    );
    return response.ok;
  }

  return { list, get, remove };
}

export type HistoryClient = ReturnType<typeof createHistoryClient>;

// --- History manager (premium-gated) ---

export interface HistoryManagerDeps {
  client: HistoryClient;
  checkEntitlement: () => Promise<{ isPremium: boolean }>;
  showInfo: (message: string) => void;
  showWarning: (message: string, ...actions: string[]) => Promise<string | undefined>;
  showError: (message: string) => void;
}

export class HistoryManager {
  private deps: HistoryManagerDeps;
  private cachedList: HistoryListResult | undefined;

  constructor(deps: HistoryManagerDeps) {
    this.deps = deps;
  }

  async assertPremium(): Promise<boolean> {
    try {
      const ent = await this.deps.checkEntitlement();
      if (!ent.isPremium) {
        const action = await this.deps.showWarning(
          "Prompt history is a Premium feature. Upgrade to access your optimization history.",
          "Upgrade",
          "Dismiss"
        );
        return false;
      }
      return true;
    } catch {
      this.deps.showError("Could not verify subscription status.");
      return false;
    }
  }

  async list(
    userId: string,
    options: { limit?: number; offset?: number; search?: string } = {}
  ): Promise<HistoryListResult | undefined> {
    if (!(await this.assertPremium())) return undefined;

    try {
      const result = await this.deps.client.list(userId, options);
      this.cachedList = result;
      return result;
    } catch (err) {
      this.deps.showError(`Failed to load history: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  }

  async get(userId: string, entryId: string): Promise<HistoryEntry | undefined> {
    if (!(await this.assertPremium())) return undefined;

    try {
      const entry = await this.deps.client.get(userId, entryId);
      if (!entry) {
        this.deps.showInfo("History entry not found.");
      }
      return entry;
    } catch (err) {
      this.deps.showError(`Failed to load entry: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  }

  async remove(userId: string, entryId: string): Promise<boolean> {
    if (!(await this.assertPremium())) return false;

    try {
      const removed = await this.deps.client.remove(userId, entryId);
      if (removed) {
        this.deps.showInfo("History entry deleted.");
      }
      return removed;
    } catch (err) {
      this.deps.showError(`Failed to delete entry: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  getCachedList(): HistoryListResult | undefined {
    return this.cachedList;
  }
}

// --- Message types ---

export const HISTORY_MESSAGE_TYPES = {
  HISTORY_LIST_REQUEST: "history.list.request",
  HISTORY_LIST_RESPONSE: "history.list.response",
  HISTORY_GET_REQUEST: "history.get.request",
  HISTORY_GET_RESPONSE: "history.get.response",
  HISTORY_DELETE_REQUEST: "history.delete.request",
  HISTORY_DELETE_RESPONSE: "history.delete.response"
} as const;

// --- Message handler factories ---

export function createHistoryListHandler(
  manager: HistoryManager,
  getUserId: () => string | undefined
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    const userId = getUserId();
    if (!userId) {
      return createResponse(
        HISTORY_MESSAGE_TYPES.HISTORY_LIST_RESPONSE,
        { success: false, error: "Not signed in" },
        envelope.correlationId
      );
    }

    const payload = envelope.payload as Record<string, unknown> | undefined;
    const opts: { limit?: number; offset?: number; search?: string } = {};
    if (typeof payload?.limit === "number") opts.limit = payload.limit;
    if (typeof payload?.offset === "number") opts.offset = payload.offset;
    if (typeof payload?.search === "string") opts.search = payload.search;

    const result = await manager.list(userId, opts);

    if (!result) {
      return createResponse(
        HISTORY_MESSAGE_TYPES.HISTORY_LIST_RESPONSE,
        { success: false, error: "Premium required or fetch failed" },
        envelope.correlationId
      );
    }

    return createResponse(
      HISTORY_MESSAGE_TYPES.HISTORY_LIST_RESPONSE,
      { success: true, ...result },
      envelope.correlationId
    );
  };
}

export function createHistoryGetHandler(
  manager: HistoryManager,
  getUserId: () => string | undefined
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    const userId = getUserId();
    if (!userId) {
      return createResponse(
        HISTORY_MESSAGE_TYPES.HISTORY_GET_RESPONSE,
        { success: false, error: "Not signed in" },
        envelope.correlationId
      );
    }

    const payload = envelope.payload as Record<string, unknown> | undefined;
    const entryId = payload?.entryId as string | undefined;
    if (!entryId) {
      return createResponse(
        HISTORY_MESSAGE_TYPES.HISTORY_GET_RESPONSE,
        { success: false, error: "entryId is required" },
        envelope.correlationId
      );
    }

    const entry = await manager.get(userId, entryId);
    return createResponse(
      HISTORY_MESSAGE_TYPES.HISTORY_GET_RESPONSE,
      entry ? { success: true, entry } : { success: false, error: "Not found or premium required" },
      envelope.correlationId
    );
  };
}

export function createHistoryDeleteHandler(
  manager: HistoryManager,
  getUserId: () => string | undefined
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    const userId = getUserId();
    if (!userId) {
      return createResponse(
        HISTORY_MESSAGE_TYPES.HISTORY_DELETE_RESPONSE,
        { success: false, error: "Not signed in" },
        envelope.correlationId
      );
    }

    const payload = envelope.payload as Record<string, unknown> | undefined;
    const entryId = payload?.entryId as string | undefined;
    if (!entryId) {
      return createResponse(
        HISTORY_MESSAGE_TYPES.HISTORY_DELETE_RESPONSE,
        { success: false, error: "entryId is required" },
        envelope.correlationId
      );
    }

    const removed = await manager.remove(userId, entryId);
    return createResponse(
      HISTORY_MESSAGE_TYPES.HISTORY_DELETE_RESPONSE,
      { success: removed },
      envelope.correlationId
    );
  };
}

// --- Internal ---

async function timedFetch(
  fetchFn: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(handle);
  }
}
