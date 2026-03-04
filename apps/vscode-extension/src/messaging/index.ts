import { z } from "zod";

// --- Message envelope ---

export const messageDirectionSchema = z.enum(["host-to-webview", "webview-to-host"]);
export type MessageDirection = z.infer<typeof messageDirectionSchema>;

export const messageEnvelopeSchema = z.object({
  type: z.string().min(1),
  direction: messageDirectionSchema,
  correlationId: z.string().min(1),
  timestamp: z.number(),
  payload: z.unknown()
});
export type MessageEnvelope = z.infer<typeof messageEnvelopeSchema>;

// --- Well-known message types ---

export const MESSAGE_TYPES = {
  // Webview -> Host requests
  OPTIMIZE_REQUEST: "optimize.request",
  TEMPLATE_LIST_REQUEST: "template.list.request",
  TEMPLATE_GET_REQUEST: "template.get.request",
  PROVIDER_STATUS_REQUEST: "provider.status.request",
  AUTH_STATUS_REQUEST: "auth.status.request",
  SETTINGS_GET_REQUEST: "settings.get.request",
  SETTINGS_UPDATE_REQUEST: "settings.update.request",
  TECHNIQUE_LIST_REQUEST: "technique.list.request",
  TECHNIQUE_VALIDATE_REQUEST: "technique.validate.request",
  CONTEXT_COLLECT_REQUEST: "context.collect.request",

  // Host -> Webview responses
  OPTIMIZE_RESPONSE: "optimize.response",
  TEMPLATE_LIST_RESPONSE: "template.list.response",
  TEMPLATE_GET_RESPONSE: "template.get.response",
  PROVIDER_STATUS_RESPONSE: "provider.status.response",
  AUTH_STATUS_RESPONSE: "auth.status.response",
  SETTINGS_GET_RESPONSE: "settings.get.response",
  SETTINGS_UPDATE_RESPONSE: "settings.update.response",
  TECHNIQUE_LIST_RESPONSE: "technique.list.response",
  TECHNIQUE_VALIDATE_RESPONSE: "technique.validate.response",
  CONTEXT_COLLECT_RESPONSE: "context.collect.response",

  // Host -> Webview events (push)
  AUTH_STATE_CHANGED: "auth.stateChanged",
  ENTITLEMENT_CHANGED: "entitlement.changed",
  PROVIDER_HEALTH_CHANGED: "provider.healthChanged",
  ERROR_NOTIFICATION: "error.notification"
} as const;

// --- Correlation ID generator ---

let correlationSeq = 0;

export function generateCorrelationId(): string {
  correlationSeq++;
  return `cor-${Date.now().toString(36)}-${correlationSeq}`;
}

// --- Envelope factory ---

export function createEnvelope(
  type: string,
  direction: MessageDirection,
  payload: unknown,
  correlationId?: string
): MessageEnvelope {
  return {
    type,
    direction,
    correlationId: correlationId ?? generateCorrelationId(),
    timestamp: Date.now(),
    payload
  };
}

export function createRequest(type: string, payload: unknown): MessageEnvelope {
  return createEnvelope(type, "webview-to-host", payload);
}

export function createResponse(
  type: string,
  payload: unknown,
  correlationId: string
): MessageEnvelope {
  return createEnvelope(type, "host-to-webview", payload, correlationId);
}

export function createEvent(type: string, payload: unknown): MessageEnvelope {
  return createEnvelope(type, "host-to-webview", payload);
}

// --- Envelope validation ---

export interface EnvelopeValidationResult {
  valid: boolean;
  envelope: MessageEnvelope | undefined;
  error: string | undefined;
}

export function validateEnvelope(raw: unknown): EnvelopeValidationResult {
  const result = messageEnvelopeSchema.safeParse(raw);
  if (result.success) {
    return { valid: true, envelope: result.data, error: undefined };
  }
  return {
    valid: false,
    envelope: undefined,
    error: result.error.issues.map((i: { message: string }) => i.message).join("; ")
  };
}

// --- Typed message handler ---

export type MessageHandler = (envelope: MessageEnvelope) => Promise<MessageEnvelope | void> | MessageEnvelope | void;

export interface MessageRouterOptions {
  onUnknownType?: (envelope: MessageEnvelope) => void;
  onValidationError?: (raw: unknown, error: string) => void;
}

export class HostMessageRouter {
  private handlers = new Map<string, MessageHandler>();
  private options: MessageRouterOptions;

  constructor(options: MessageRouterOptions = {}) {
    this.options = options;
  }

  register(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  unregister(type: string): void {
    this.handlers.delete(type);
  }

  hasHandler(type: string): boolean {
    return this.handlers.has(type);
  }

  getRegisteredTypes(): string[] {
    return [...this.handlers.keys()];
  }

  async dispatch(raw: unknown): Promise<MessageEnvelope | undefined> {
    const validation = validateEnvelope(raw);
    if (!validation.valid || !validation.envelope) {
      this.options.onValidationError?.(raw, validation.error ?? "Unknown validation error");
      return createResponse(
        MESSAGE_TYPES.ERROR_NOTIFICATION,
        {
          code: "invalid_envelope",
          message: validation.error ?? "Invalid message envelope"
        },
        "error"
      );
    }

    const envelope = validation.envelope;
    const handler = this.handlers.get(envelope.type);

    if (!handler) {
      this.options.onUnknownType?.(envelope);
      return createResponse(
        MESSAGE_TYPES.ERROR_NOTIFICATION,
        {
          code: "unknown_message_type",
          message: `No handler registered for message type: ${envelope.type}`
        },
        envelope.correlationId
      );
    }

    try {
      const response = await handler(envelope);
      return response ?? undefined;
    } catch (err) {
      return createResponse(
        MESSAGE_TYPES.ERROR_NOTIFICATION,
        {
          code: "handler_error",
          message: err instanceof Error ? err.message : String(err)
        },
        envelope.correlationId
      );
    }
  }
}

// --- Webview panel abstraction ---

export interface WebviewPanelLike {
  postMessage(message: unknown): Promise<boolean>;
  onDidReceiveMessage(listener: (message: unknown) => void): { dispose(): void };
  dispose(): void;
}

export interface PanelManagerOptions {
  router: HostMessageRouter;
  onPostError?: (error: unknown) => void;
}

export class WebviewPanelManager {
  private panels = new Map<string, WebviewPanelLike>();
  private disposables = new Map<string, { dispose(): void }>();
  private router: HostMessageRouter;
  private onPostError: ((error: unknown) => void) | undefined;

  constructor(options: PanelManagerOptions) {
    this.router = options.router;
    this.onPostError = options.onPostError;
  }

  attach(panelId: string, panel: WebviewPanelLike): void {
    // Clean up old attachment if any
    this.detach(panelId);

    this.panels.set(panelId, panel);

    const disposable = panel.onDidReceiveMessage(async (message) => {
      const response = await this.router.dispatch(message);
      if (response) {
        try {
          await panel.postMessage(response);
        } catch (err) {
          this.onPostError?.(err);
        }
      }
    });

    this.disposables.set(panelId, disposable);
  }

  detach(panelId: string): void {
    const d = this.disposables.get(panelId);
    if (d) {
      d.dispose();
      this.disposables.delete(panelId);
    }
    this.panels.delete(panelId);
  }

  async broadcast(envelope: MessageEnvelope): Promise<void> {
    for (const [, panel] of this.panels) {
      try {
        await panel.postMessage(envelope);
      } catch (err) {
        this.onPostError?.(err);
      }
    }
  }

  getPanelIds(): string[] {
    return [...this.panels.keys()];
  }

  hasPanel(panelId: string): boolean {
    return this.panels.has(panelId);
  }

  disposeAll(): void {
    for (const id of [...this.panels.keys()]) {
      this.detach(id);
    }
  }
}
