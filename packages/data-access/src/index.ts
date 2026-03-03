import type { BootstrapResponse } from "@prmpt/contracts";
import { createCorrelationId } from "@prmpt/shared-utils";

export const TRIAL_SESSION_LIMIT = 9;

export interface UserBootstrapState {
  clerkUserId: string;
  totalSessions: number;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumeSessionsResult {
  state: UserBootstrapState;
  consumedSessions: number;
  remainingSessions: number;
  blocked: boolean;
}

export interface UserBootstrapRepository {
  upsertUser(clerkUserId: string): Promise<UserBootstrapState>;
  getUserState(clerkUserId: string): Promise<UserBootstrapState | undefined>;
  setPremium(clerkUserId: string, isPremium: boolean): Promise<UserBootstrapState>;
  incrementSessions(clerkUserId: string, count?: number): Promise<UserBootstrapState>;
  consumeSessions(clerkUserId: string, sessionCount: number): Promise<ConsumeSessionsResult>;
}

export type EntitlementEventSource = "trial" | "polar" | "manual";

export interface PaymentWebhookEventInput {
  provider: "polar";
  eventId: string;
  eventType: string;
  clerkUserId?: string;
  payload?: Record<string, unknown>;
}

export interface PaymentWebhookEventRecord extends PaymentWebhookEventInput {
  receivedAt: string;
}

export interface EntitlementAuditEventInput {
  clerkUserId: string;
  source: EntitlementEventSource;
  eventType: string;
  payload?: Record<string, unknown>;
}

export interface EntitlementAuditEventRecord extends EntitlementAuditEventInput {
  createdAt: string;
}

export interface PaymentEventRepository {
  markWebhookEventProcessed(event: PaymentWebhookEventInput): Promise<boolean>;
  logEntitlementEvent(event: EntitlementAuditEventInput): Promise<void>;
}

interface SupabaseUserRow {
  clerk_user_id: string;
  total_sessions: number;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

interface SupabaseWebhookEventRow {
  provider: "polar";
  event_id: string;
  event_type: string;
  clerk_user_id: string | null;
  payload: Record<string, unknown> | null;
  received_at: string;
}

interface SupabaseEntitlementEventRow {
  clerk_user_id: string;
  source: EntitlementEventSource;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface SupabaseUserBootstrapRepositoryOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  now?: () => Date;
  fetchFn?: typeof fetch;
}

export interface SupabasePaymentEventRepositoryOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  now?: () => Date;
  fetchFn?: typeof fetch;
}

export class DataAccessError extends Error {
  readonly correlationId: string;
  readonly operation: string;
  readonly status: number | undefined;

  constructor(
    operation: string,
    message: string,
    correlationId: string,
    status?: number
  ) {
    super(`[${operation}] ${message} (corr=${correlationId})`);
    this.name = "DataAccessError";
    this.operation = operation;
    this.correlationId = correlationId;
    this.status = status;
  }
}

export class InMemoryUserBootstrapRepository implements UserBootstrapRepository {
  private readonly users = new Map<string, UserBootstrapState>();
  private readonly now: () => Date;
  private readonly pendingLocks = new Map<string, Promise<void>>();

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  async upsertUser(clerkUserId: string): Promise<UserBootstrapState> {
    return this.withUserLock(clerkUserId, async () => {
      const existing = this.users.get(clerkUserId);
      if (existing) {
        const updated = {
          ...existing,
          updatedAt: this.now().toISOString()
        };
        this.users.set(clerkUserId, updated);
        return updated;
      }

      return this.createUser(clerkUserId);
    });
  }

  async getUserState(clerkUserId: string): Promise<UserBootstrapState | undefined> {
    return this.users.get(clerkUserId);
  }

  async setPremium(clerkUserId: string, isPremium: boolean): Promise<UserBootstrapState> {
    return this.withUserLock(clerkUserId, async () => {
      const user = this.users.get(clerkUserId) ?? this.createUser(clerkUserId);
      const updated: UserBootstrapState = {
        ...user,
        isPremium,
        updatedAt: this.now().toISOString()
      };

      this.users.set(clerkUserId, updated);
      return updated;
    });
  }

  async incrementSessions(clerkUserId: string, count = 1): Promise<UserBootstrapState> {
    return this.withUserLock(clerkUserId, async () => {
      assertPositiveSessionCount(count);
      const user = this.users.get(clerkUserId) ?? this.createUser(clerkUserId);
      const updated: UserBootstrapState = {
        ...user,
        totalSessions: user.totalSessions + count,
        updatedAt: this.now().toISOString()
      };

      this.users.set(clerkUserId, updated);
      return updated;
    });
  }

  async consumeSessions(clerkUserId: string, sessionCount: number): Promise<ConsumeSessionsResult> {
    return this.withUserLock(clerkUserId, async () => {
      assertPositiveSessionCount(sessionCount);
      const state = this.users.get(clerkUserId) ?? this.createUser(clerkUserId);

      if (state.isPremium) {
        return {
          state,
          consumedSessions: sessionCount,
          remainingSessions: TRIAL_SESSION_LIMIT,
          blocked: false
        };
      }

      const remainingBefore = Math.max(0, TRIAL_SESSION_LIMIT - state.totalSessions);
      if (remainingBefore < sessionCount) {
        return {
          state,
          consumedSessions: 0,
          remainingSessions: remainingBefore,
          blocked: true
        };
      }

      const updated: UserBootstrapState = {
        ...state,
        totalSessions: state.totalSessions + sessionCount,
        updatedAt: this.now().toISOString()
      };
      this.users.set(clerkUserId, updated);

      return {
        state: updated,
        consumedSessions: sessionCount,
        remainingSessions: Math.max(0, TRIAL_SESSION_LIMIT - updated.totalSessions),
        blocked: false
      };
    });
  }

  private createUser(clerkUserId: string): UserBootstrapState {
    const createdAt = this.now().toISOString();
    const created: UserBootstrapState = {
      clerkUserId,
      totalSessions: 0,
      isPremium: false,
      createdAt,
      updatedAt: createdAt
    };

    this.users.set(clerkUserId, created);
    return created;
  }

  private async withUserLock<T>(clerkUserId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.pendingLocks.get(clerkUserId) ?? Promise.resolve();
    let release!: () => void;
    const lock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => lock);

    this.pendingLocks.set(clerkUserId, queued);
    await previous;

    try {
      return await work();
    } finally {
      release();
      if (this.pendingLocks.get(clerkUserId) === queued) {
        this.pendingLocks.delete(clerkUserId);
      }
    }
  }
}

export class InMemoryPaymentEventRepository implements PaymentEventRepository {
  private readonly now: () => Date;
  private readonly webhookEvents = new Map<string, PaymentWebhookEventRecord>();
  private readonly entitlementEvents: EntitlementAuditEventRecord[] = [];

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  async markWebhookEventProcessed(event: PaymentWebhookEventInput): Promise<boolean> {
    assertNonEmptyString(event.provider, "provider");
    assertNonEmptyString(event.eventId, "eventId");
    assertNonEmptyString(event.eventType, "eventType");

    const key = `${event.provider}:${event.eventId}`;
    if (this.webhookEvents.has(key)) {
      return false;
    }

    const created: PaymentWebhookEventRecord = {
      provider: event.provider,
      eventId: event.eventId,
      eventType: event.eventType,
      ...(event.clerkUserId ? { clerkUserId: event.clerkUserId } : {}),
      ...(event.payload ? { payload: event.payload } : {}),
      receivedAt: this.now().toISOString()
    };

    this.webhookEvents.set(key, created);
    return true;
  }

  async logEntitlementEvent(event: EntitlementAuditEventInput): Promise<void> {
    assertNonEmptyString(event.clerkUserId, "clerkUserId");
    assertNonEmptyString(event.source, "source");
    assertNonEmptyString(event.eventType, "eventType");

    this.entitlementEvents.push({
      clerkUserId: event.clerkUserId,
      source: event.source,
      eventType: event.eventType,
      ...(event.payload ? { payload: event.payload } : {}),
      createdAt: this.now().toISOString()
    });
  }

  listWebhookEvents(): PaymentWebhookEventRecord[] {
    return Array.from(this.webhookEvents.values());
  }

  listEntitlementEvents(clerkUserId?: string): EntitlementAuditEventRecord[] {
    if (!clerkUserId) {
      return [...this.entitlementEvents];
    }
    return this.entitlementEvents.filter((event) => event.clerkUserId === clerkUserId);
  }
}

export class SupabaseUserBootstrapRepository implements UserBootstrapRepository {
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly now: () => Date;
  private readonly fetchFn: typeof fetch;

  constructor(options: SupabaseUserBootstrapRepositoryOptions) {
    assertNonEmptyString(options.supabaseUrl, "supabaseUrl");
    assertNonEmptyString(options.serviceRoleKey, "serviceRoleKey");

    this.supabaseUrl = options.supabaseUrl;
    this.serviceRoleKey = options.serviceRoleKey;
    this.now = options.now ?? (() => new Date());
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async upsertUser(clerkUserId: string): Promise<UserBootstrapState> {
    assertNonEmptyString(clerkUserId, "clerkUserId");

    const rows = await this.requestRows("upsert_user", {
      method: "POST",
      path: `/users?on_conflict=clerk_user_id&select=${encodeURIComponent(SELECT_FIELDS)}`,
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: [
        {
          clerk_user_id: clerkUserId
        }
      ]
    });

    const row = rows[0];
    if (!row) {
      throw new DataAccessError(
        "upsert_user",
        "Supabase upsert returned no rows.",
        createCorrelationId()
      );
    }

    return mapRow(row);
  }

  async getUserState(clerkUserId: string): Promise<UserBootstrapState | undefined> {
    assertNonEmptyString(clerkUserId, "clerkUserId");

    const rows = await this.requestRows("get_user_state", {
      method: "GET",
      path:
        `/users?select=${encodeURIComponent(SELECT_FIELDS)}` +
        `&clerk_user_id=eq.${encodeURIComponent(clerkUserId)}&limit=1`
    });

    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  async setPremium(clerkUserId: string, isPremium: boolean): Promise<UserBootstrapState> {
    assertNonEmptyString(clerkUserId, "clerkUserId");
    await this.upsertUser(clerkUserId);

    return this.updateWithRetry(clerkUserId, (state) => ({
      is_premium: isPremium,
      total_sessions: state.totalSessions
    }));
  }

  async incrementSessions(clerkUserId: string, count = 1): Promise<UserBootstrapState> {
    assertNonEmptyString(clerkUserId, "clerkUserId");
    assertPositiveSessionCount(count);
    await this.upsertUser(clerkUserId);

    return this.updateWithRetry(clerkUserId, (state) => ({
      is_premium: state.isPremium,
      total_sessions: state.totalSessions + count
    }));
  }

  async consumeSessions(clerkUserId: string, sessionCount: number): Promise<ConsumeSessionsResult> {
    assertNonEmptyString(clerkUserId, "clerkUserId");
    assertPositiveSessionCount(sessionCount);

    const baseState = await this.upsertUser(clerkUserId);
    if (baseState.isPremium) {
      return {
        state: baseState,
        consumedSessions: sessionCount,
        remainingSessions: TRIAL_SESSION_LIMIT,
        blocked: false
      };
    }

    const remainingBefore = Math.max(0, TRIAL_SESSION_LIMIT - baseState.totalSessions);
    if (remainingBefore < sessionCount) {
      return {
        state: baseState,
        consumedSessions: 0,
        remainingSessions: remainingBefore,
        blocked: true
      };
    }

    const updated = await this.updateWithRetry(clerkUserId, (state) => ({
      is_premium: state.isPremium,
      total_sessions: state.totalSessions + sessionCount
    }));

    return {
      state: updated,
      consumedSessions: sessionCount,
      remainingSessions: Math.max(0, TRIAL_SESSION_LIMIT - updated.totalSessions),
      blocked: false
    };
  }

  private async updateWithRetry(
    clerkUserId: string,
    mutation: (state: UserBootstrapState) => {
      total_sessions: number;
      is_premium: boolean;
    }
  ): Promise<UserBootstrapState> {
    const attempts = 3;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const current = await this.getUserState(clerkUserId);
      if (!current) {
        throw new DataAccessError(
          "update_with_retry",
          `User state missing for clerkUserId=${clerkUserId}`,
          createCorrelationId()
        );
      }

      const next = mutation(current);
      const rows = await this.requestRows("patch_user_state", {
        method: "PATCH",
        path:
          `/users?clerk_user_id=eq.${encodeURIComponent(clerkUserId)}` +
          `&updated_at=eq.${encodeURIComponent(current.updatedAt)}` +
          `&select=${encodeURIComponent(SELECT_FIELDS)}`,
        headers: {
          Prefer: "return=representation"
        },
        body: {
          ...next,
          updated_at: this.now().toISOString()
        }
      });

      if (rows[0]) {
        return mapRow(rows[0]);
      }
    }

    throw new DataAccessError(
      "patch_user_state",
      "Could not commit user state after optimistic retries.",
      createCorrelationId()
    );
  }

  private async requestRows(
    operation: string,
    input: {
      method: "GET" | "POST" | "PATCH";
      path: string;
      headers?: Record<string, string>;
      body?: unknown;
    }
  ): Promise<SupabaseUserRow[]> {
    const correlationId = createCorrelationId();
    const url = new URL(`/rest/v1${input.path}`, this.supabaseUrl);
    const requestInit: RequestInit = {
      method: input.method,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/json",
        "x-correlation-id": correlationId,
        ...(input.headers ?? {})
      },
      ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {})
    };
    const response = await this.fetchFn(url, requestInit);

    const raw = await response.text();
    if (!response.ok) {
      throw new DataAccessError(
        operation,
        `Supabase request failed status=${response.status} body=${raw}`,
        correlationId,
        response.status
      );
    }

    if (raw.length === 0) {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new DataAccessError(
        operation,
        "Supabase response was not valid JSON.",
        correlationId,
        response.status
      );
    }

    if (!Array.isArray(parsed)) {
      throw new DataAccessError(
        operation,
        "Supabase response must be an array.",
        correlationId,
        response.status
      );
    }

    return parsed as SupabaseUserRow[];
  }
}

export class SupabasePaymentEventRepository implements PaymentEventRepository {
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly now: () => Date;
  private readonly fetchFn: typeof fetch;

  constructor(options: SupabasePaymentEventRepositoryOptions) {
    assertNonEmptyString(options.supabaseUrl, "supabaseUrl");
    assertNonEmptyString(options.serviceRoleKey, "serviceRoleKey");

    this.supabaseUrl = options.supabaseUrl;
    this.serviceRoleKey = options.serviceRoleKey;
    this.now = options.now ?? (() => new Date());
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async markWebhookEventProcessed(event: PaymentWebhookEventInput): Promise<boolean> {
    assertNonEmptyString(event.provider, "provider");
    assertNonEmptyString(event.eventId, "eventId");
    assertNonEmptyString(event.eventType, "eventType");

    const rows = await this.requestRows("insert_webhook_event", {
      method: "POST",
      path:
        `/payment_webhook_events?on_conflict=provider,event_id` +
        `&select=${encodeURIComponent(WEBHOOK_EVENT_SELECT_FIELDS)}`,
      headers: {
        Prefer: "resolution=ignore-duplicates,return=representation"
      },
      body: [
        {
          provider: event.provider,
          event_id: event.eventId,
          event_type: event.eventType,
          clerk_user_id: event.clerkUserId ?? null,
          payload: event.payload ?? null,
          received_at: this.now().toISOString()
        }
      ]
    });

    return rows.length > 0;
  }

  async logEntitlementEvent(event: EntitlementAuditEventInput): Promise<void> {
    assertNonEmptyString(event.clerkUserId, "clerkUserId");
    assertNonEmptyString(event.source, "source");
    assertNonEmptyString(event.eventType, "eventType");

    await this.requestRows("insert_entitlement_event", {
      method: "POST",
      path: `/entitlement_events?select=${encodeURIComponent(ENTITLEMENT_EVENT_SELECT_FIELDS)}`,
      headers: {
        Prefer: "return=representation"
      },
      body: [
        {
          clerk_user_id: event.clerkUserId,
          source: event.source,
          event_type: event.eventType,
          payload: event.payload ?? null,
          created_at: this.now().toISOString()
        }
      ]
    });
  }

  private async requestRows(
    operation: string,
    input: {
      method: "GET" | "POST" | "PATCH";
      path: string;
      headers?: Record<string, string>;
      body?: unknown;
    }
  ): Promise<unknown[]> {
    const correlationId = createCorrelationId();
    const url = new URL(`/rest/v1${input.path}`, this.supabaseUrl);
    const requestInit: RequestInit = {
      method: input.method,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/json",
        "x-correlation-id": correlationId,
        ...(input.headers ?? {})
      },
      ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {})
    };
    const response = await this.fetchFn(url, requestInit);

    const raw = await response.text();
    if (!response.ok) {
      throw new DataAccessError(
        operation,
        `Supabase request failed status=${response.status} body=${raw}`,
        correlationId,
        response.status
      );
    }

    if (raw.length === 0) {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new DataAccessError(
        operation,
        "Supabase response was not valid JSON.",
        correlationId,
        response.status
      );
    }

    if (!Array.isArray(parsed)) {
      throw new DataAccessError(
        operation,
        "Supabase response must be an array.",
        correlationId,
        response.status
      );
    }

    return parsed;
  }
}

const SELECT_FIELDS = "clerk_user_id,total_sessions,is_premium,created_at,updated_at";
const WEBHOOK_EVENT_SELECT_FIELDS =
  "provider,event_id,event_type,clerk_user_id,payload,received_at";
const ENTITLEMENT_EVENT_SELECT_FIELDS = "clerk_user_id,source,event_type,payload,created_at";

export function toBootstrapResponse(state: UserBootstrapState): BootstrapResponse {
  const remainingSessions = state.isPremium
    ? TRIAL_SESSION_LIMIT
    : Math.max(0, TRIAL_SESSION_LIMIT - state.totalSessions);

  return {
    userId: state.clerkUserId,
    sessionLimit: TRIAL_SESSION_LIMIT,
    remainingSessions,
    isPremium: state.isPremium
  };
}

export function toUsageConsumeResponse(result: ConsumeSessionsResult): {
  userId: string;
  consumedSessions: number;
  remainingSessions: number;
  isPremium: boolean;
} {
  return {
    userId: result.state.clerkUserId,
    consumedSessions: result.consumedSessions,
    remainingSessions: result.state.isPremium ? TRIAL_SESSION_LIMIT : result.remainingSessions,
    isPremium: result.state.isPremium
  };
}

function mapRow(row: SupabaseUserRow): UserBootstrapState {
  return {
    clerkUserId: row.clerk_user_id,
    totalSessions: row.total_sessions,
    isPremium: row.is_premium,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertNonEmptyString(value: string, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
}

function assertPositiveSessionCount(value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`sessionCount must be a positive integer. received=${value}`);
  }
}

// --- Template repository (ST-06-03) ---

export interface StoredTemplate {
  id: string;
  schemaVersion: string;
  title: string;
  category: string;
  description: string;
  tier: "starter_free" | "premium";
  ownership: "builtin" | "user";
  modelFamilies: string[];
  promptBody: string;
  variables: Record<string, unknown>[];
  tags: string[];
  suggestedTechniques: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFilter {
  category?: string;
  tier?: string;
  modelFamily?: string;
  ownership?: string;
  search?: string;
}

export interface TemplateRepository {
  create(template: StoredTemplate): Promise<StoredTemplate>;
  getById(id: string): Promise<StoredTemplate | undefined>;
  listByUser(userId: string, filter?: TemplateFilter): Promise<StoredTemplate[]>;
  update(id: string, fields: Partial<StoredTemplate>): Promise<StoredTemplate | undefined>;
  delete(id: string): Promise<boolean>;
  countByUser(userId: string): Promise<number>;
}

export class InMemoryTemplateRepository implements TemplateRepository {
  private readonly store = new Map<string, StoredTemplate>();
  private idCounter = 0;

  /** Seed built-in templates */
  seed(templates: StoredTemplate[]): void {
    for (const t of templates) {
      this.store.set(t.id, { ...t });
    }
  }

  async create(template: StoredTemplate): Promise<StoredTemplate> {
    const record = { ...template };
    if (!record.id) {
      this.idCounter += 1;
      record.id = `tpl-user-${this.idCounter}`;
    }
    this.store.set(record.id, record);
    return record;
  }

  async getById(id: string): Promise<StoredTemplate | undefined> {
    const t = this.store.get(id);
    return t ? { ...t } : undefined;
  }

  async listByUser(userId: string, filter?: TemplateFilter): Promise<StoredTemplate[]> {
    let results = Array.from(this.store.values()).filter(
      (t) => t.ownership === "builtin" || t.createdBy === userId
    );

    if (filter?.category) {
      results = results.filter((t) => t.category === filter.category);
    }
    if (filter?.tier) {
      results = results.filter((t) => t.tier === filter.tier);
    }
    if (filter?.modelFamily) {
      results = results.filter((t) => t.modelFamilies.includes(filter.modelFamily!));
    }
    if (filter?.ownership) {
      results = results.filter((t) => t.ownership === filter.ownership);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return results.map((t) => ({ ...t }));
  }

  async update(id: string, fields: Partial<StoredTemplate>): Promise<StoredTemplate | undefined> {
    const existing = this.store.get(id);
    if (!existing) return undefined;

    const updated: StoredTemplate = { ...existing, ...fields, id: existing.id };
    this.store.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async countByUser(userId: string): Promise<number> {
    return Array.from(this.store.values()).filter(
      (t) => t.ownership === "user" && t.createdBy === userId
    ).length;
  }
}

// --- Prompt History repository (ST-07-05) ---

export interface PromptHistoryRecord {
  id: string;
  userId: string;
  inputPrompt: string;
  optimizedPrompt: string;
  modelFamily: string;
  outputFormat: string;
  provider: string;
  score: number | undefined;
  templateId: string | undefined;
  createdAt: string;
  metadata: Record<string, unknown> | undefined;
}

export interface PromptHistoryFilter {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PromptHistoryRepository {
  add(record: PromptHistoryRecord): Promise<PromptHistoryRecord>;
  getById(userId: string, entryId: string): Promise<PromptHistoryRecord | undefined>;
  list(userId: string, filter?: PromptHistoryFilter): Promise<{ entries: PromptHistoryRecord[]; total: number }>;
  remove(userId: string, entryId: string): Promise<boolean>;
  countByUser(userId: string): Promise<number>;
  clear(userId: string): Promise<number>;
}

export const MAX_HISTORY_ENTRIES = 500;

export class InMemoryPromptHistoryRepository implements PromptHistoryRepository {
  private readonly entries = new Map<string, PromptHistoryRecord>();
  private readonly now: () => Date;
  private idCounter = 0;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  async add(record: PromptHistoryRecord): Promise<PromptHistoryRecord> {
    const entry: PromptHistoryRecord = {
      ...record,
      id: record.id || this.generateId(),
      createdAt: record.createdAt || this.now().toISOString()
    };

    // Enforce max entries per user
    const userEntries = [...this.entries.values()]
      .filter((e) => e.userId === entry.userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    if (userEntries.length >= MAX_HISTORY_ENTRIES) {
      const oldest = userEntries[0];
      if (oldest) this.entries.delete(oldest.id);
    }

    this.entries.set(entry.id, entry);
    return { ...entry };
  }

  async getById(userId: string, entryId: string): Promise<PromptHistoryRecord | undefined> {
    const entry = this.entries.get(entryId);
    if (!entry || entry.userId !== userId) return undefined;
    return { ...entry };
  }

  async list(
    userId: string,
    filter?: PromptHistoryFilter
  ): Promise<{ entries: PromptHistoryRecord[]; total: number }> {
    let results = [...this.entries.values()]
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.inputPrompt.toLowerCase().includes(q) ||
          e.optimizedPrompt.toLowerCase().includes(q) ||
          e.provider.toLowerCase().includes(q)
      );
    }

    const total = results.length;
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 50;
    results = results.slice(offset, offset + limit);

    return { entries: results.map((e) => ({ ...e })), total };
  }

  async remove(userId: string, entryId: string): Promise<boolean> {
    const entry = this.entries.get(entryId);
    if (!entry || entry.userId !== userId) return false;
    return this.entries.delete(entryId);
  }

  async countByUser(userId: string): Promise<number> {
    return [...this.entries.values()].filter((e) => e.userId === userId).length;
  }

  async clear(userId: string): Promise<number> {
    const toDelete = [...this.entries.values()].filter((e) => e.userId === userId);
    for (const entry of toDelete) {
      this.entries.delete(entry.id);
    }
    return toDelete.length;
  }

  private generateId(): string {
    this.idCounter++;
    return `hist-${Date.now().toString(36)}-${this.idCounter}`;
  }
}
