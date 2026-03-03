import { createCorrelationId } from "@prmpt/shared-utils";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

type FetchLike = typeof fetch;

export type ProviderId = "openai" | "anthropic" | "gemini" | "openrouter" | "groq" | "ollama";

export type ProviderErrorCode =
  | "auth_error"
  | "rate_limit"
  | "provider_unavailable"
  | "validation_error"
  | "timeout_error"
  | "network_error"
  | "model_not_available"
  | "provider_response_error"
  | "unknown_error";

export interface HealthCheckResult {
  ok: boolean;
  detail?: string;
  correlationId: string;
}

export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderCapabilities {
  streaming: boolean;
  structuredOutput: boolean;
  reasoning: boolean;
  penalties: boolean;
  routing: boolean;
  tokenEstimation: boolean;
}

export interface ProviderOptimizeRequest {
  prompt: string;
  modelFamily: "claude" | "gpt" | "gemini" | "local";
  outputFormat: "xml" | "json" | "markdown" | "text";
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface ProviderStreamChunk {
  delta: string;
  done: boolean;
  correlationId: string;
}

export interface ProviderOptimizeResponse {
  optimizedPrompt: string;
  usage: ProviderUsage;
  correlationId: string;
}

export interface ProviderTokenEstimateRequest {
  prompt: string;
  modelFamily: "claude" | "gpt" | "gemini" | "local";
}

export interface ProviderTokenEstimateResponse {
  estimatedTokens: number;
  correlationId: string;
}

export interface ProviderAdapter {
  providerId: ProviderId;
  capabilities: ProviderCapabilities;
  healthCheck(): Promise<HealthCheckResult>;
  optimize(request: ProviderOptimizeRequest): Promise<ProviderOptimizeResponse>;
  streamOptimize?(request: ProviderOptimizeRequest): AsyncIterable<ProviderStreamChunk>;
  estimateTokens?(request: ProviderTokenEstimateRequest): Promise<ProviderTokenEstimateResponse>;
}

interface ProviderErrorOptions {
  providerId: ProviderId;
  code: ProviderErrorCode;
  message: string;
  correlationId?: string;
  retryable?: boolean;
}

export class ProviderError extends Error {
  readonly providerId: ProviderId;
  readonly code: ProviderErrorCode;
  readonly correlationId: string;
  readonly retryable: boolean;

  constructor(options: ProviderErrorOptions) {
    super(options.message);
    this.name = "ProviderError";
    this.providerId = options.providerId;
    this.code = options.code;
    this.correlationId = options.correlationId ?? createCorrelationId();
    this.retryable = options.retryable ?? false;
  }
}

export class AuthError extends ProviderError {
  constructor(providerId: ProviderId, message = "Provider authentication failed.", correlationId?: string) {
    super({
      providerId,
      code: "auth_error",
      message,
      retryable: false,
      ...(correlationId ? { correlationId } : {})
    });
    this.name = "AuthError";
  }
}

export class RateLimitError extends ProviderError {
  constructor(providerId: ProviderId, message = "Provider rate limit exceeded.", correlationId?: string) {
    super({
      providerId,
      code: "rate_limit",
      message,
      retryable: true,
      ...(correlationId ? { correlationId } : {})
    });
    this.name = "RateLimitError";
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(providerId: ProviderId, message = "Provider is currently unavailable.", correlationId?: string) {
    super({
      providerId,
      code: "provider_unavailable",
      message,
      retryable: true,
      ...(correlationId ? { correlationId } : {})
    });
    this.name = "ProviderUnavailableError";
  }
}

export class ValidationError extends ProviderError {
  constructor(providerId: ProviderId, message = "Provider request validation failed.", correlationId?: string) {
    super({
      providerId,
      code: "validation_error",
      message,
      retryable: false,
      ...(correlationId ? { correlationId } : {})
    });
    this.name = "ValidationError";
  }
}

export class TimeoutError extends ProviderError {
  constructor(providerId: ProviderId, message = "Provider request timed out.", correlationId?: string) {
    super({
      providerId,
      code: "timeout_error",
      message,
      retryable: true,
      ...(correlationId ? { correlationId } : {})
    });
    this.name = "TimeoutError";
  }
}

export class NetworkError extends ProviderError {
  constructor(providerId: ProviderId, message = "Provider network request failed.", correlationId?: string) {
    super({
      providerId,
      code: "network_error",
      message,
      retryable: true,
      ...(correlationId ? { correlationId } : {})
    });
    this.name = "NetworkError";
  }
}

export class ModelNotAvailableError extends ProviderError {
  constructor(providerId: ProviderId, message = "Requested model is not available.", correlationId?: string) {
    super({
      providerId,
      code: "model_not_available",
      message,
      retryable: false,
      ...(correlationId ? { correlationId } : {})
    });
    this.name = "ModelNotAvailableError";
  }
}

export class ProviderResponseError extends ProviderError {
  constructor(providerId: ProviderId, message = "Provider response was malformed.", correlationId?: string) {
    super({
      providerId,
      code: "provider_response_error",
      message,
      retryable: false,
      ...(correlationId ? { correlationId } : {})
    });
    this.name = "ProviderResponseError";
  }
}

export function normalizeProviderError(
  error: unknown,
  providerId: ProviderId,
  correlationId?: string
): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new TimeoutError(providerId, "Provider request timed out.", correlationId);
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return new TimeoutError(providerId, error.message, correlationId);
    }

    const messageLower = error.message.toLowerCase();
    if (messageLower.includes("fetch") || messageLower.includes("network") || messageLower.includes("econn")) {
      return new NetworkError(providerId, error.message, correlationId);
    }

    return new ProviderError({
      providerId,
      code: "unknown_error",
      message: error.message,
      ...(correlationId ? { correlationId } : {}),
      retryable: false
    });
  }

  return new ProviderError({
    providerId,
    code: "unknown_error",
    message: "Unknown provider failure.",
    ...(correlationId ? { correlationId } : {}),
    retryable: false
  });
}

interface BaseAdapterConfig {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  fetchFn?: FetchLike;
}

export interface OpenAIAdapterConfig extends BaseAdapterConfig {
  baseUrl?: string;
}

export interface AnthropicAdapterConfig extends BaseAdapterConfig {
  baseUrl?: string;
  anthropicVersion?: string;
}

export interface GeminiAdapterConfig extends BaseAdapterConfig {
  baseUrl?: string;
}

export interface OpenRouterAdapterConfig extends BaseAdapterConfig {
  baseUrl?: string;
  siteUrl?: string;
  siteName?: string;
}

export interface GroqAdapterConfig extends BaseAdapterConfig {
  baseUrl?: string;
}

export interface OllamaAdapterConfig {
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: FetchLike;
}

export const PROVIDER_CAPABILITY_MATRIX: Readonly<Record<ProviderId, ProviderCapabilities>> = {
  openai: { streaming: true, structuredOutput: true, reasoning: true, penalties: true, routing: false, tokenEstimation: true },
  anthropic: { streaming: true, structuredOutput: false, reasoning: true, penalties: false, routing: false, tokenEstimation: true },
  gemini: { streaming: true, structuredOutput: true, reasoning: true, penalties: false, routing: false, tokenEstimation: true },
  openrouter: { streaming: true, structuredOutput: true, reasoning: true, penalties: false, routing: true, tokenEstimation: true },
  groq: { streaming: true, structuredOutput: false, reasoning: false, penalties: false, routing: false, tokenEstimation: true },
  ollama: { streaming: true, structuredOutput: false, reasoning: false, penalties: false, routing: false, tokenEstimation: true }
};

export interface PreflightResult {
  valid: boolean;
  warnings: string[];
  adjustedRequest: ProviderOptimizeRequest;
}

export function preflightValidate(
  request: ProviderOptimizeRequest,
  capabilities: ProviderCapabilities
): PreflightResult {
  const warnings: string[] = [];
  const adjusted: ProviderOptimizeRequest = { ...request };

  if (request.outputFormat === "json" && !capabilities.structuredOutput) {
    adjusted.outputFormat = "markdown";
    warnings.push("Structured JSON output is not supported by this provider. Falling back to markdown.");
  }

  if (request.stream && !capabilities.streaming) {
    adjusted.stream = false;
    warnings.push("Streaming is not supported by this provider. Using non-streaming mode.");
  }

  return { valid: true, warnings, adjustedRequest: adjusted };
}

export function getProviderCapabilities(providerId: ProviderId): ProviderCapabilities {
  return PROVIDER_CAPABILITY_MATRIX[providerId];
}

export function createOpenAIAdapter(config: OpenAIAdapterConfig): ProviderAdapter {
  const providerId: ProviderId = "openai";
  const apiKey = requireNonEmptyString(config.apiKey, providerId, "OpenAI apiKey is required.");
  const defaultModel = requireNonEmptyString(config.model, providerId, "OpenAI model is required.");
  const baseUrl = sanitizeBaseUrl(config.baseUrl ?? DEFAULT_OPENAI_BASE_URL);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = config.fetchFn ?? fetch;

  async function healthCheck(): Promise<HealthCheckResult> {
    try {
      const correlationId = createCorrelationId();
      const response = await runRequest({
        providerId,
        url: `${baseUrl}/models?limit=1`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        timeoutMs,
        fetchFn,
        correlationId
      });
      return {
        ok: response.status >= 200 && response.status < 300,
        correlationId
      };
    } catch (error) {
      const normalized = normalizeProviderError(error, providerId);
      return {
        ok: false,
        detail: normalized.message,
        correlationId: normalized.correlationId
      };
    }
  }

  async function optimize(request: ProviderOptimizeRequest): Promise<ProviderOptimizeResponse> {
    if (request.stream) {
      return aggregateStreamedResponse(providerId, streamOptimize(request), request.prompt);
    }

    validateCommonRequest(request, providerId);
    validateModelFamily(request, providerId, "gpt");
    validateOptionalRange(request.temperature, 0, 2, providerId, "OpenAI temperature must be between 0 and 2.");

    const correlationId = createCorrelationId();
    const body = buildOpenAIRequestBody(request, defaultModel, false);
    const response = await runRequest({
      providerId,
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });
    const payload = await parseJsonResponse(response, providerId, correlationId);
    const optimizedPrompt = readOpenAIText(payload, providerId, correlationId);
    const usage = readOpenAIUsage(payload, request.prompt, optimizedPrompt);

    return {
      optimizedPrompt,
      usage,
      correlationId
    };
  }

  async function* streamOptimize(
    request: ProviderOptimizeRequest
  ): AsyncGenerator<ProviderStreamChunk, void, undefined> {
    validateCommonRequest(request, providerId);
    validateModelFamily(request, providerId, "gpt");
    validateOptionalRange(request.temperature, 0, 2, providerId, "OpenAI temperature must be between 0 and 2.");

    const correlationId = createCorrelationId();
    const body = buildOpenAIRequestBody(request, defaultModel, true);
    const response = await runRequest({
      providerId,
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });
    const stream = readSseStream(response, providerId, correlationId);
    for await (const payloadText of stream) {
      const payload = parseJsonChunk(payloadText, providerId, correlationId);
      const delta = readOpenAIDelta(payload);
      if (delta.length > 0) {
        yield {
          delta,
          done: false,
          correlationId
        };
      }
    }

    yield {
      delta: "",
      done: true,
      correlationId
    };
  }

  return {
    providerId,
    capabilities: {
      streaming: true,
      structuredOutput: true,
      reasoning: true,
      penalties: true,
      routing: false,
      tokenEstimation: true
    },
    healthCheck,
    optimize,
    streamOptimize,
    async estimateTokens(request) {
      return {
        estimatedTokens: estimateTokens(request.prompt),
        correlationId: createCorrelationId()
      };
    }
  };
}

export function createAnthropicAdapter(config: AnthropicAdapterConfig): ProviderAdapter {
  const providerId: ProviderId = "anthropic";
  const apiKey = requireNonEmptyString(config.apiKey, providerId, "Anthropic apiKey is required.");
  const defaultModel = requireNonEmptyString(config.model, providerId, "Anthropic model is required.");
  const baseUrl = sanitizeBaseUrl(config.baseUrl ?? DEFAULT_ANTHROPIC_BASE_URL);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = config.fetchFn ?? fetch;
  const anthropicVersion = config.anthropicVersion ?? "2023-06-01";

  async function healthCheck(): Promise<HealthCheckResult> {
    try {
      const correlationId = createCorrelationId();
      const response = await runRequest({
        providerId,
        url: `${baseUrl}/models`,
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": anthropicVersion
        },
        timeoutMs,
        fetchFn,
        correlationId
      });
      return {
        ok: response.status >= 200 && response.status < 300,
        correlationId
      };
    } catch (error) {
      const normalized = normalizeProviderError(error, providerId);
      return {
        ok: false,
        detail: normalized.message,
        correlationId: normalized.correlationId
      };
    }
  }

  async function optimize(request: ProviderOptimizeRequest): Promise<ProviderOptimizeResponse> {
    if (request.stream) {
      return aggregateStreamedResponse(providerId, streamOptimize(request), request.prompt);
    }

    validateCommonRequest(request, providerId);
    validateModelFamily(request, providerId, "claude");
    validateOptionalRange(
      request.temperature,
      0,
      1,
      providerId,
      "Anthropic temperature must be between 0 and 1."
    );

    const correlationId = createCorrelationId();
    const body = buildAnthropicRequestBody(request, defaultModel, false);
    const response = await runRequest({
      providerId,
      url: `${baseUrl}/messages`,
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
        "Content-Type": "application/json"
      },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });
    const payload = await parseJsonResponse(response, providerId, correlationId);
    const optimizedPrompt = readAnthropicText(payload, providerId, correlationId);
    const usage = readAnthropicUsage(payload, request.prompt, optimizedPrompt);

    return {
      optimizedPrompt,
      usage,
      correlationId
    };
  }

  async function* streamOptimize(
    request: ProviderOptimizeRequest
  ): AsyncGenerator<ProviderStreamChunk, void, undefined> {
    validateCommonRequest(request, providerId);
    validateModelFamily(request, providerId, "claude");
    validateOptionalRange(
      request.temperature,
      0,
      1,
      providerId,
      "Anthropic temperature must be between 0 and 1."
    );

    const correlationId = createCorrelationId();
    const body = buildAnthropicRequestBody(request, defaultModel, true);
    const response = await runRequest({
      providerId,
      url: `${baseUrl}/messages`,
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
        "Content-Type": "application/json"
      },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });

    const stream = readSseStream(response, providerId, correlationId);
    for await (const payloadText of stream) {
      const payload = parseJsonChunk(payloadText, providerId, correlationId);
      const delta = readAnthropicDelta(payload);
      if (delta.length > 0) {
        yield {
          delta,
          done: false,
          correlationId
        };
      }
    }

    yield {
      delta: "",
      done: true,
      correlationId
    };
  }

  return {
    providerId,
    capabilities: {
      streaming: true,
      structuredOutput: false,
      reasoning: true,
      penalties: false,
      routing: false,
      tokenEstimation: true
    },
    healthCheck,
    optimize,
    streamOptimize,
    async estimateTokens(request) {
      return {
        estimatedTokens: estimateTokens(request.prompt),
        correlationId: createCorrelationId()
      };
    }
  };
}

export function createGeminiAdapter(config: GeminiAdapterConfig): ProviderAdapter {
  const providerId: ProviderId = "gemini";
  const apiKey = requireNonEmptyString(config.apiKey, providerId, "Gemini apiKey is required.");
  const defaultModel = requireNonEmptyString(config.model, providerId, "Gemini model is required.");
  const baseUrl = sanitizeBaseUrl(config.baseUrl ?? DEFAULT_GEMINI_BASE_URL);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = config.fetchFn ?? fetch;

  async function healthCheck(): Promise<HealthCheckResult> {
    try {
      const correlationId = createCorrelationId();
      const response = await runRequest({
        providerId,
        url: `${baseUrl}/models?key=${encodeURIComponent(apiKey)}`,
        method: "GET",
        headers: {},
        timeoutMs,
        fetchFn,
        correlationId
      });
      return {
        ok: response.status >= 200 && response.status < 300,
        correlationId
      };
    } catch (error) {
      const normalized = normalizeProviderError(error, providerId);
      return {
        ok: false,
        detail: normalized.message,
        correlationId: normalized.correlationId
      };
    }
  }

  async function optimize(request: ProviderOptimizeRequest): Promise<ProviderOptimizeResponse> {
    if (request.stream) {
      return aggregateStreamedResponse(providerId, streamOptimize(request), request.prompt);
    }

    validateCommonRequest(request, providerId);
    validateModelFamily(request, providerId, "gemini");
    validateOptionalRange(
      request.temperature,
      0,
      2,
      providerId,
      "Gemini temperature must be between 0 and 2."
    );

    const correlationId = createCorrelationId();
    const model = request.model ?? defaultModel;
    const body = buildGeminiRequestBody(request, false);
    const response = await runRequest({
      providerId,
      url: `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });
    const payload = await parseJsonResponse(response, providerId, correlationId);
    const optimizedPrompt = readGeminiText(payload, providerId, correlationId);
    const usage = readGeminiUsage(payload, request.prompt, optimizedPrompt);

    return {
      optimizedPrompt,
      usage,
      correlationId
    };
  }

  async function* streamOptimize(
    request: ProviderOptimizeRequest
  ): AsyncGenerator<ProviderStreamChunk, void, undefined> {
    validateCommonRequest(request, providerId);
    validateModelFamily(request, providerId, "gemini");
    validateOptionalRange(
      request.temperature,
      0,
      2,
      providerId,
      "Gemini temperature must be between 0 and 2."
    );

    const correlationId = createCorrelationId();
    const model = request.model ?? defaultModel;
    const body = buildGeminiRequestBody(request, true);
    const response = await runRequest({
      providerId,
      url: `${baseUrl}/models/${encodeURIComponent(
        model
      )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });

    const stream = readSseStream(response, providerId, correlationId);
    for await (const payloadText of stream) {
      const payload = parseJsonChunk(payloadText, providerId, correlationId);
      const delta = readGeminiDelta(payload);
      if (delta.length > 0) {
        yield {
          delta,
          done: false,
          correlationId
        };
      }
    }

    yield {
      delta: "",
      done: true,
      correlationId
    };
  }

  return {
    providerId,
    capabilities: {
      streaming: true,
      structuredOutput: true,
      reasoning: true,
      penalties: false,
      routing: false,
      tokenEstimation: true
    },
    healthCheck,
    optimize,
    streamOptimize,
    async estimateTokens(request) {
      return {
        estimatedTokens: estimateTokens(request.prompt),
        correlationId: createCorrelationId()
      };
    }
  };
}

export function createNoopAdapter(providerId: ProviderId): ProviderAdapter {
  return {
    providerId,
    capabilities: {
      streaming: true,
      structuredOutput: true,
      reasoning: false,
      penalties: true,
      routing: false,
      tokenEstimation: true
    },
    async healthCheck() {
      return { ok: true, correlationId: createCorrelationId() };
    },
    async optimize(request) {
      const correlationId = createCorrelationId();
      return {
        optimizedPrompt: request.prompt,
        usage: {
          inputTokens: request.prompt.length,
          outputTokens: request.prompt.length
        },
        correlationId
      };
    },
    async *streamOptimize(request) {
      const correlationId = createCorrelationId();
      yield {
        delta: request.prompt,
        done: false,
        correlationId
      };
      yield {
        delta: "",
        done: true,
        correlationId
      };
    },
    async estimateTokens(request) {
      return {
        estimatedTokens: Math.max(1, request.prompt.trim().length),
        correlationId: createCorrelationId()
      };
    }
  };
}

export function createOpenRouterAdapter(config: OpenRouterAdapterConfig): ProviderAdapter {
  const providerId: ProviderId = "openrouter";
  const apiKey = requireNonEmptyString(config.apiKey, providerId, "OpenRouter apiKey is required.");
  const defaultModel = requireNonEmptyString(config.model, providerId, "OpenRouter model is required.");
  const baseUrl = sanitizeBaseUrl(config.baseUrl ?? DEFAULT_OPENROUTER_BASE_URL);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = config.fetchFn ?? fetch;
  const siteUrl = config.siteUrl;
  const siteName = config.siteName;

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };
    if (siteUrl) headers["HTTP-Referer"] = siteUrl;
    if (siteName) headers["X-Title"] = siteName;
    return headers;
  }

  async function healthCheck(): Promise<HealthCheckResult> {
    try {
      const correlationId = createCorrelationId();
      const response = await runRequest({
        providerId,
        url: `${baseUrl}/models`,
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        timeoutMs,
        fetchFn,
        correlationId
      });
      return { ok: response.status >= 200 && response.status < 300, correlationId };
    } catch (error) {
      const normalized = normalizeProviderError(error, providerId);
      return { ok: false, detail: normalized.message, correlationId: normalized.correlationId };
    }
  }

  async function optimize(request: ProviderOptimizeRequest): Promise<ProviderOptimizeResponse> {
    if (request.stream) {
      return aggregateStreamedResponse(providerId, streamOptimize(request), request.prompt);
    }

    validateCommonRequest(request, providerId);
    validateOptionalRange(request.temperature, 0, 2, providerId, "Temperature must be between 0 and 2.");

    const correlationId = createCorrelationId();
    const body = buildOpenAIRequestBody(request, defaultModel, false);
    const response = await runRequest({
      providerId,
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: buildHeaders(),
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });
    const payload = await parseJsonResponse(response, providerId, correlationId);
    const optimizedPrompt = readOpenAIText(payload, providerId, correlationId);
    const usage = readOpenAIUsage(payload, request.prompt, optimizedPrompt);
    return { optimizedPrompt, usage, correlationId };
  }

  async function* streamOptimize(
    request: ProviderOptimizeRequest
  ): AsyncGenerator<ProviderStreamChunk, void, undefined> {
    validateCommonRequest(request, providerId);
    validateOptionalRange(request.temperature, 0, 2, providerId, "Temperature must be between 0 and 2.");

    const correlationId = createCorrelationId();
    const body = buildOpenAIRequestBody(request, defaultModel, true);
    const response = await runRequest({
      providerId,
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: buildHeaders(),
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });

    const stream = readSseStream(response, providerId, correlationId);
    for await (const payloadText of stream) {
      const payload = parseJsonChunk(payloadText, providerId, correlationId);
      const delta = readOpenAIDelta(payload);
      if (delta.length > 0) {
        yield { delta, done: false, correlationId };
      }
    }
    yield { delta: "", done: true, correlationId };
  }

  return {
    providerId,
    capabilities: PROVIDER_CAPABILITY_MATRIX.openrouter,
    healthCheck,
    optimize,
    streamOptimize,
    async estimateTokens(request) {
      return { estimatedTokens: estimateTokens(request.prompt), correlationId: createCorrelationId() };
    }
  };
}

export function createGroqAdapter(config: GroqAdapterConfig): ProviderAdapter {
  const providerId: ProviderId = "groq";
  const apiKey = requireNonEmptyString(config.apiKey, providerId, "Groq apiKey is required.");
  const defaultModel = requireNonEmptyString(config.model, providerId, "Groq model is required.");
  const baseUrl = sanitizeBaseUrl(config.baseUrl ?? DEFAULT_GROQ_BASE_URL);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = config.fetchFn ?? fetch;

  async function healthCheck(): Promise<HealthCheckResult> {
    try {
      const correlationId = createCorrelationId();
      const response = await runRequest({
        providerId,
        url: `${baseUrl}/models`,
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        timeoutMs,
        fetchFn,
        correlationId
      });
      return { ok: response.status >= 200 && response.status < 300, correlationId };
    } catch (error) {
      const normalized = normalizeProviderError(error, providerId);
      return { ok: false, detail: normalized.message, correlationId: normalized.correlationId };
    }
  }

  async function optimize(request: ProviderOptimizeRequest): Promise<ProviderOptimizeResponse> {
    if (request.stream) {
      return aggregateStreamedResponse(providerId, streamOptimize(request), request.prompt);
    }

    validateCommonRequest(request, providerId);
    validateOptionalRange(request.temperature, 0, 2, providerId, "Groq temperature must be between 0 and 2.");

    const correlationId = createCorrelationId();
    const body = buildOpenAIRequestBody(request, defaultModel, false);
    delete body.response_format;

    const response = await runRequest({
      providerId,
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });
    const payload = await parseJsonResponse(response, providerId, correlationId);
    const optimizedPrompt = readOpenAIText(payload, providerId, correlationId);
    const usage = readOpenAIUsage(payload, request.prompt, optimizedPrompt);
    return { optimizedPrompt, usage, correlationId };
  }

  async function* streamOptimize(
    request: ProviderOptimizeRequest
  ): AsyncGenerator<ProviderStreamChunk, void, undefined> {
    validateCommonRequest(request, providerId);
    validateOptionalRange(request.temperature, 0, 2, providerId, "Groq temperature must be between 0 and 2.");

    const correlationId = createCorrelationId();
    const body = buildOpenAIRequestBody(request, defaultModel, true);
    delete body.response_format;

    const response = await runRequest({
      providerId,
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });

    const stream = readSseStream(response, providerId, correlationId);
    for await (const payloadText of stream) {
      const payload = parseJsonChunk(payloadText, providerId, correlationId);
      const delta = readOpenAIDelta(payload);
      if (delta.length > 0) {
        yield { delta, done: false, correlationId };
      }
    }
    yield { delta: "", done: true, correlationId };
  }

  return {
    providerId,
    capabilities: PROVIDER_CAPABILITY_MATRIX.groq,
    healthCheck,
    optimize,
    streamOptimize,
    async estimateTokens(request) {
      return { estimatedTokens: estimateTokens(request.prompt), correlationId: createCorrelationId() };
    }
  };
}

export function createOllamaAdapter(config: OllamaAdapterConfig): ProviderAdapter {
  const providerId: ProviderId = "ollama";
  const defaultModel = requireNonEmptyString(config.model, providerId, "Ollama model is required.");
  const baseUrl = sanitizeBaseUrl(config.baseUrl ?? DEFAULT_OLLAMA_BASE_URL);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = config.fetchFn ?? fetch;

  async function healthCheck(): Promise<HealthCheckResult> {
    try {
      const correlationId = createCorrelationId();
      const response = await runRequest({
        providerId,
        url: `${baseUrl}/api/tags`,
        method: "GET",
        headers: {},
        timeoutMs,
        fetchFn,
        correlationId
      });
      return { ok: response.status >= 200 && response.status < 300, correlationId };
    } catch (error) {
      const normalized = normalizeProviderError(error, providerId);
      return { ok: false, detail: normalized.message, correlationId: normalized.correlationId };
    }
  }

  async function optimize(request: ProviderOptimizeRequest): Promise<ProviderOptimizeResponse> {
    if (request.stream) {
      return aggregateStreamedResponse(providerId, streamOptimize(request), request.prompt);
    }

    validateCommonRequest(request, providerId);
    validateModelFamily(request, providerId, "local");

    const correlationId = createCorrelationId();
    const body = buildOpenAIRequestBody(request, defaultModel, false);
    delete body.response_format;

    const response = await runRequest({
      providerId,
      url: `${baseUrl}/v1/chat/completions`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });
    const payload = await parseJsonResponse(response, providerId, correlationId);
    const optimizedPrompt = readOpenAIText(payload, providerId, correlationId);
    const usage = readOpenAIUsage(payload, request.prompt, optimizedPrompt);
    return { optimizedPrompt, usage, correlationId };
  }

  async function* streamOptimize(
    request: ProviderOptimizeRequest
  ): AsyncGenerator<ProviderStreamChunk, void, undefined> {
    validateCommonRequest(request, providerId);
    validateModelFamily(request, providerId, "local");

    const correlationId = createCorrelationId();
    const body = buildOpenAIRequestBody(request, defaultModel, true);
    delete body.response_format;

    const response = await runRequest({
      providerId,
      url: `${baseUrl}/v1/chat/completions`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      timeoutMs,
      fetchFn,
      correlationId
    });

    const stream = readSseStream(response, providerId, correlationId);
    for await (const payloadText of stream) {
      const payload = parseJsonChunk(payloadText, providerId, correlationId);
      const delta = readOpenAIDelta(payload);
      if (delta.length > 0) {
        yield { delta, done: false, correlationId };
      }
    }
    yield { delta: "", done: true, correlationId };
  }

  return {
    providerId,
    capabilities: PROVIDER_CAPABILITY_MATRIX.ollama,
    healthCheck,
    optimize,
    streamOptimize,
    async estimateTokens(request) {
      return { estimatedTokens: estimateTokens(request.prompt), correlationId: createCorrelationId() };
    }
  };
}

function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function requireNonEmptyString(value: string, providerId: ProviderId, message: string): string {
  if (value.trim().length === 0) {
    throw new ValidationError(providerId, message);
  }
  return value;
}

function validateModelFamily(
  request: ProviderOptimizeRequest,
  providerId: ProviderId,
  expectedFamily: ProviderOptimizeRequest["modelFamily"]
): void {
  if (request.modelFamily !== expectedFamily) {
    throw new ValidationError(
      providerId,
      `Model family "${request.modelFamily}" is not supported by ${providerId}. Expected "${expectedFamily}".`
    );
  }
}

function validateCommonRequest(request: ProviderOptimizeRequest, providerId: ProviderId): void {
  if (request.prompt.trim().length === 0) {
    throw new ValidationError(providerId, "Prompt cannot be empty.");
  }

  if (typeof request.maxOutputTokens === "number") {
    if (!Number.isInteger(request.maxOutputTokens) || request.maxOutputTokens <= 0) {
      throw new ValidationError(providerId, "maxOutputTokens must be a positive integer.");
    }
  }

  if (typeof request.topP === "number") {
    if (!Number.isFinite(request.topP) || request.topP <= 0 || request.topP > 1) {
      throw new ValidationError(providerId, "topP must be between 0 (exclusive) and 1 (inclusive).");
    }
  }

  if (request.stopSequences !== undefined) {
    if (request.stopSequences.length > 8) {
      throw new ValidationError(providerId, "stopSequences supports up to 8 values.");
    }
    for (const sequence of request.stopSequences) {
      if (sequence.trim().length === 0) {
        throw new ValidationError(providerId, "stopSequences cannot include empty values.");
      }
    }
  }
}

function validateOptionalRange(
  value: number | undefined,
  min: number,
  max: number,
  providerId: ProviderId,
  message: string
): void {
  if (value === undefined) {
    return;
  }
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ValidationError(providerId, message);
  }
}

function buildOpenAIRequestBody(
  request: ProviderOptimizeRequest,
  defaultModel: string,
  stream: boolean
): Record<string, unknown> {
  const messages = [
    {
      role: "system",
      content: request.systemPrompt?.trim().length ? request.systemPrompt : "You optimize prompts for developers."
    },
    {
      role: "user",
      content: request.prompt
    }
  ];

  const body: Record<string, unknown> = {
    model: request.model ?? defaultModel,
    messages,
    stream
  };

  if (typeof request.temperature === "number") {
    body.temperature = request.temperature;
  }
  if (typeof request.maxOutputTokens === "number") {
    body.max_tokens = request.maxOutputTokens;
  }
  if (typeof request.topP === "number") {
    body.top_p = request.topP;
  }
  if (request.stopSequences && request.stopSequences.length > 0) {
    body.stop = request.stopSequences;
  }
  if (request.outputFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  return body;
}

function buildAnthropicRequestBody(
  request: ProviderOptimizeRequest,
  defaultModel: string,
  stream: boolean
): Record<string, unknown> {
  const userPrompt =
    request.outputFormat === "json"
      ? `${request.prompt}\n\nReturn only valid JSON with no additional prose.`
      : request.prompt;

  const body: Record<string, unknown> = {
    model: request.model ?? defaultModel,
    system: request.systemPrompt?.trim().length ? request.systemPrompt : "You optimize prompts for developers.",
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: request.maxOutputTokens ?? 1024,
    stream
  };

  if (typeof request.temperature === "number") {
    body.temperature = request.temperature;
  }
  if (typeof request.topP === "number") {
    body.top_p = request.topP;
  }
  if (request.stopSequences && request.stopSequences.length > 0) {
    body.stop_sequences = request.stopSequences;
  }

  return body;
}

function buildGeminiRequestBody(request: ProviderOptimizeRequest, stream: boolean): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {};
  if (typeof request.temperature === "number") {
    generationConfig.temperature = request.temperature;
  }
  if (typeof request.maxOutputTokens === "number") {
    generationConfig.maxOutputTokens = request.maxOutputTokens;
  }
  if (typeof request.topP === "number") {
    generationConfig.topP = request.topP;
  }
  if (request.stopSequences && request.stopSequences.length > 0) {
    generationConfig.stopSequences = request.stopSequences;
  }
  if (request.outputFormat === "json") {
    generationConfig.responseMimeType = "application/json";
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: request.prompt }] }],
    generationConfig
  };

  if (request.systemPrompt && request.systemPrompt.trim().length > 0) {
    body.systemInstruction = {
      parts: [{ text: request.systemPrompt }]
    };
  }

  if (stream) {
    body.stream = true;
  }

  return body;
}

interface RequestOptions {
  providerId: ProviderId;
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: unknown;
  timeoutMs: number;
  fetchFn: FetchLike;
  correlationId: string;
}

async function runRequest(options: RequestOptions): Promise<Response> {
  const init: RequestInit = {
    method: options.method,
    headers: options.headers
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetchWithTimeout(options.fetchFn, options.url, init, options.timeoutMs);
    if (!response.ok) {
      const detail = await safeReadText(response);
      throw mapHttpError(options.providerId, response.status, detail, options.correlationId);
    }
    return response;
  } catch (error) {
    throw normalizeProviderError(error, options.providerId, options.correlationId);
  }
}

async function fetchWithTimeout(
  fetchFn: FetchLike,
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetchFn(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function parseJsonResponse(
  response: Response,
  providerId: ProviderId,
  correlationId: string
): Promise<unknown> {
  const text = await safeReadText(response);
  if (text.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ProviderResponseError(providerId, "Provider returned non-JSON response.", correlationId);
  }
}

function parseJsonChunk(payload: string, providerId: ProviderId, correlationId: string): unknown {
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw new ProviderResponseError(providerId, "Provider stream emitted invalid JSON.", correlationId);
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function mapHttpError(
  providerId: ProviderId,
  status: number,
  detail: string,
  correlationId: string
): ProviderError {
  const message = detail.trim().length ? `Provider returned ${status}: ${detail}` : `Provider returned ${status}.`;

  if (status === 400) {
    return new ValidationError(providerId, message, correlationId);
  }
  if (status === 401 || status === 403) {
    return new AuthError(providerId, message, correlationId);
  }
  if (status === 404) {
    return new ModelNotAvailableError(providerId, message, correlationId);
  }
  if (status === 408 || status === 504) {
    return new TimeoutError(providerId, message, correlationId);
  }
  if (status === 429) {
    return new RateLimitError(providerId, message, correlationId);
  }
  if (status >= 500) {
    return new ProviderUnavailableError(providerId, message, correlationId);
  }
  return new ProviderResponseError(providerId, message, correlationId);
}

function readOpenAIText(payload: unknown, providerId: ProviderId, correlationId: string): string {
  const root = asRecord(payload);
  const choices = asArray(root?.choices);
  const firstChoice = asRecord(choices?.[0]);
  const message = asRecord(firstChoice?.message);
  const content = message?.content;

  if (typeof content === "string" && content.trim().length > 0) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const chunks: string[] = [];
    for (const part of content) {
      const record = asRecord(part);
      const text = record?.text;
      if (typeof text === "string" && text.length > 0) {
        chunks.push(text);
      }
    }
    const joined = chunks.join("").trim();
    if (joined.length > 0) {
      return joined;
    }
  }

  throw new ProviderResponseError(providerId, "OpenAI response did not include message content.", correlationId);
}

function readOpenAIDelta(payload: unknown): string {
  const root = asRecord(payload);
  const choices = asArray(root?.choices);
  const firstChoice = asRecord(choices?.[0]);
  const delta = asRecord(firstChoice?.delta);
  const content = delta?.content;

  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const chunks: string[] = [];
    for (const part of content) {
      const record = asRecord(part);
      const text = record?.text;
      if (typeof text === "string" && text.length > 0) {
        chunks.push(text);
      }
    }
    return chunks.join("");
  }
  return "";
}

function readOpenAIUsage(payload: unknown, inputPrompt: string, outputPrompt: string): ProviderUsage {
  const root = asRecord(payload);
  const usage = asRecord(root?.usage);
  return buildUsage(
    asPositiveNumber(usage?.prompt_tokens),
    asPositiveNumber(usage?.completion_tokens),
    inputPrompt,
    outputPrompt
  );
}

function readAnthropicText(payload: unknown, providerId: ProviderId, correlationId: string): string {
  const root = asRecord(payload);
  const content = asArray(root?.content);
  const chunks: string[] = [];

  if (content) {
    for (const item of content) {
      const record = asRecord(item);
      if (record?.type === "text" && typeof record.text === "string" && record.text.length > 0) {
        chunks.push(record.text);
      }
    }
  }

  const text = chunks.join("").trim();
  if (text.length > 0) {
    return text;
  }

  throw new ProviderResponseError(providerId, "Anthropic response did not include text content.", correlationId);
}

function readAnthropicDelta(payload: unknown): string {
  const root = asRecord(payload);
  if (!root) {
    return "";
  }

  if (root.type === "content_block_delta") {
    const delta = asRecord(root.delta);
    if (delta?.type === "text_delta" && typeof delta.text === "string") {
      return delta.text;
    }
  }
  return "";
}

function readAnthropicUsage(payload: unknown, inputPrompt: string, outputPrompt: string): ProviderUsage {
  const root = asRecord(payload);
  const usage = asRecord(root?.usage);
  return buildUsage(
    asPositiveNumber(usage?.input_tokens),
    asPositiveNumber(usage?.output_tokens),
    inputPrompt,
    outputPrompt
  );
}

function readGeminiText(payload: unknown, providerId: ProviderId, correlationId: string): string {
  const root = asRecord(payload);
  const candidates = asArray(root?.candidates);
  const firstCandidate = asRecord(candidates?.[0]);
  const content = asRecord(firstCandidate?.content);
  const parts = asArray(content?.parts);
  const chunks: string[] = [];

  if (parts) {
    for (const part of parts) {
      const partRecord = asRecord(part);
      const text = partRecord?.text;
      if (typeof text === "string" && text.length > 0) {
        chunks.push(text);
      }
    }
  }

  const text = chunks.join("").trim();
  if (text.length > 0) {
    return text;
  }

  throw new ProviderResponseError(providerId, "Gemini response did not include text content.", correlationId);
}

function readGeminiDelta(payload: unknown): string {
  const root = asRecord(payload);
  const candidates = asArray(root?.candidates);
  const firstCandidate = asRecord(candidates?.[0]);
  const content = asRecord(firstCandidate?.content);
  const parts = asArray(content?.parts);
  const chunks: string[] = [];

  if (parts) {
    for (const part of parts) {
      const partRecord = asRecord(part);
      const text = partRecord?.text;
      if (typeof text === "string" && text.length > 0) {
        chunks.push(text);
      }
    }
  }

  return chunks.join("");
}

function readGeminiUsage(payload: unknown, inputPrompt: string, outputPrompt: string): ProviderUsage {
  const root = asRecord(payload);
  const usage = asRecord(root?.usageMetadata);
  return buildUsage(
    asPositiveNumber(usage?.promptTokenCount),
    asPositiveNumber(usage?.candidatesTokenCount),
    inputPrompt,
    outputPrompt
  );
}

function buildUsage(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  inputPrompt: string,
  outputPrompt: string
): ProviderUsage {
  const fallbackInput = estimateTokens(inputPrompt);
  const fallbackOutput = estimateTokens(outputPrompt);

  return {
    inputTokens: inputTokens ?? fallbackInput,
    outputTokens: outputTokens ?? fallbackOutput
  };
}

async function aggregateStreamedResponse(
  providerId: ProviderId,
  stream: AsyncIterable<ProviderStreamChunk>,
  inputPrompt: string
): Promise<ProviderOptimizeResponse> {
  let optimizedPrompt = "";
  let correlationId = createCorrelationId();

  for await (const chunk of stream) {
    correlationId = chunk.correlationId;
    if (chunk.delta.length > 0) {
      optimizedPrompt += chunk.delta;
    }
  }

  const normalizedOutput = optimizedPrompt.trim();
  if (normalizedOutput.length === 0) {
    throw new ProviderResponseError(providerId, "Streaming response did not produce text.", correlationId);
  }

  return {
    optimizedPrompt: normalizedOutput,
    usage: buildUsage(undefined, undefined, inputPrompt, normalizedOutput),
    correlationId
  };
}

async function* readSseStream(
  response: Response,
  providerId: ProviderId,
  correlationId: string
): AsyncGenerator<string, void, undefined> {
  const body = response.body;
  if (!body) {
    throw new ProviderResponseError(providerId, "Provider stream response body was empty.", correlationId);
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }

      buffer += decoder.decode(chunk.value, { stream: true });
      const parts = splitSseEvents(buffer);
      buffer = parts.remaining;

      for (const event of parts.events) {
        for (const data of extractSseData(event)) {
          if (data === "[DONE]") {
            return;
          }
          if (data.length > 0) {
            yield data;
          }
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
      for (const data of extractSseData(buffer)) {
        if (data === "[DONE]") {
          return;
        }
        if (data.length > 0) {
          yield data;
        }
      }
    }
  } catch (error) {
    throw normalizeProviderError(error, providerId, correlationId);
  } finally {
    reader.releaseLock();
  }
}

function splitSseEvents(buffer: string): { events: string[]; remaining: string } {
  const delimiter = /\r?\n\r?\n/g;
  const events: string[] = [];
  let lastIndex = 0;
  let match = delimiter.exec(buffer);

  while (match) {
    const event = buffer.slice(lastIndex, match.index);
    if (event.trim().length > 0) {
      events.push(event);
    }
    lastIndex = match.index + match[0].length;
    match = delimiter.exec(buffer);
  }

  return {
    events,
    remaining: buffer.slice(lastIndex)
  };
}

function extractSseData(eventChunk: string): string[] {
  const lines = eventChunk.split(/\r?\n/);
  const data: string[] = [];

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }
    const payload = line.slice(5).trim();
    if (payload.length > 0) {
      data.push(payload);
    }
  }

  return data;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.floor(value);
}

function estimateTokens(prompt: string): number {
  return Math.max(1, Math.ceil(prompt.trim().length / 4));
}
