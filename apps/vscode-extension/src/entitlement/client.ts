export interface EntitlementStatus {
  userId: string;
  isPremium: boolean;
  source?: "trial" | "polar" | "manual";
}

export interface CheckoutResult {
  provider: "polar";
  checkoutUrl: string;
  checkoutId?: string;
}

export interface UsageResult {
  userId: string;
  consumedSessions: number;
  remainingSessions: number;
  isPremium: boolean;
}

export class EntitlementClientError extends Error {
  readonly status: number;
  readonly errorCode: string;

  constructor(status: number, body: string) {
    const parsed = safeJsonParse(body);
    const code = typeof parsed?.error === "string" ? parsed.error : "unknown_error";
    const message =
      typeof parsed?.message === "string"
        ? parsed.message
        : `Entitlement request failed with status ${status}.`;
    super(message);
    this.name = "EntitlementClientError";
    this.status = status;
    this.errorCode = code;
  }
}

type FetchLike = typeof globalThis.fetch;

export interface EntitlementClientConfig {
  baseUrl: string;
  fetchFn?: FetchLike;
  timeoutMs?: number;
}

export function createEntitlementClient(config: EntitlementClientConfig) {
  const baseUrl = config.baseUrl.endsWith("/") ? config.baseUrl.slice(0, -1) : config.baseUrl;
  const fetchFn: FetchLike = config.fetchFn ?? globalThis.fetch;
  const timeoutMs = config.timeoutMs ?? 10_000;

  async function getEntitlement(
    userId: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<EntitlementStatus> {
    const url = new URL(`${baseUrl}/api/v1/entitlement`);
    url.searchParams.set("userId", userId);
    if (options.forceRefresh) {
      url.searchParams.set("refresh", "true");
    }

    const response = await timedFetch(fetchFn, url.toString(), { method: "GET" }, timeoutMs);
    if (!response.ok) {
      throw new EntitlementClientError(response.status, await safeText(response));
    }
    return (await response.json()) as EntitlementStatus;
  }

  async function startCheckout(userId: string): Promise<CheckoutResult> {
    const response = await timedFetch(
      fetchFn,
      `${baseUrl}/api/v1/payment/checkout/polar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      },
      timeoutMs
    );
    if (!response.ok) {
      throw new EntitlementClientError(response.status, await safeText(response));
    }
    return (await response.json()) as CheckoutResult;
  }

  async function consumeUsage(userId: string, sessionCount = 1): Promise<UsageResult> {
    const response = await timedFetch(
      fetchFn,
      `${baseUrl}/api/v1/usage/consume`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionCount })
      },
      timeoutMs
    );
    if (!response.ok) {
      throw new EntitlementClientError(response.status, await safeText(response));
    }
    return (await response.json()) as UsageResult;
  }

  return { getEntitlement, startCheckout, consumeUsage };
}

export type EntitlementClient = ReturnType<typeof createEntitlementClient>;

async function timedFetch(
  fetchFn: FetchLike,
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

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  try {
    const result = JSON.parse(text);
    return typeof result === "object" && result !== null
      ? (result as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
