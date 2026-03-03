import type { MessageEnvelope } from "../messaging/index.js";
import { createResponse, createEvent, MESSAGE_TYPES } from "../messaging/index.js";
import type { UpgradeContext } from "../entitlement/upgrade.js";

// --- Onboarding state machine ---

export type OnboardingStep =
  | "welcome"
  | "auth_prompt"
  | "provider_setup"
  | "first_optimize"
  | "completed";

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skipped: boolean;
  completedAt: number | undefined;
}

export interface AccountSnapshot {
  signedIn: boolean;
  userId: string | undefined;
  isPremium: boolean;
  remainingSessions: number;
  displayName: string | undefined;
}

export interface StatusBarState {
  text: string;
  tooltip: string;
  icon: "account" | "warning" | "error" | "check" | "loading";
  command: string | undefined;
}

// --- Onboarding progress manager ---

const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "auth_prompt",
  "provider_setup",
  "first_optimize"
];

const ONBOARDING_STORAGE_KEY = "prmpt.onboarding.state";

export interface OnboardingStorageLike {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
}

export interface OnboardingManagerDeps {
  storage: OnboardingStorageLike;
  showInfo: (message: string) => void;
  showWarning: (message: string, ...actions: string[]) => Promise<string | undefined>;
  openWalkthrough?: () => void;
  onStateChange?: (state: OnboardingState) => void;
}

export class OnboardingManager {
  private state: OnboardingState = {
    currentStep: "welcome",
    completedSteps: [],
    skipped: false,
    completedAt: undefined
  };
  private deps: OnboardingManagerDeps;

  constructor(deps: OnboardingManagerDeps) {
    this.deps = deps;
  }

  getState(): OnboardingState {
    return { ...this.state, completedSteps: [...this.state.completedSteps] };
  }

  isComplete(): boolean {
    return this.state.currentStep === "completed";
  }

  async load(): Promise<OnboardingState> {
    const raw = await this.deps.storage.get(ONBOARDING_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as OnboardingState;
        if (parsed.currentStep && Array.isArray(parsed.completedSteps)) {
          this.state = parsed;
        }
      } catch {
        // corrupted state, use defaults
      }
    }
    return this.getState();
  }

  async save(): Promise<void> {
    await this.deps.storage.store(ONBOARDING_STORAGE_KEY, JSON.stringify(this.state));
  }

  async completeStep(step: OnboardingStep): Promise<OnboardingState> {
    if (this.state.completedSteps.includes(step)) return this.getState();

    this.state.completedSteps.push(step);
    this.state = { ...this.state, completedSteps: [...this.state.completedSteps] };

    // Advance to next incomplete step
    const nextStep = ONBOARDING_STEPS.find((s) => !this.state.completedSteps.includes(s));
    if (nextStep) {
      this.state.currentStep = nextStep;
    } else {
      this.state.currentStep = "completed";
      this.state.completedAt = Date.now();
    }

    await this.save();
    this.deps.onStateChange?.(this.getState());
    return this.getState();
  }

  async skipOnboarding(): Promise<OnboardingState> {
    this.state = {
      currentStep: "completed",
      completedSteps: [...ONBOARDING_STEPS],
      skipped: true,
      completedAt: Date.now()
    };
    await this.save();
    this.deps.onStateChange?.(this.getState());
    return this.getState();
  }

  async reset(): Promise<OnboardingState> {
    this.state = {
      currentStep: "welcome",
      completedSteps: [],
      skipped: false,
      completedAt: undefined
    };
    await this.save();
    this.deps.onStateChange?.(this.getState());
    return this.getState();
  }

  async promptFirstRun(): Promise<void> {
    if (this.isComplete()) return;

    const action = await this.deps.showWarning(
      "Welcome to prmpt! Your prompts stay local — optimize with your own API keys (BYOK). Set up now?",
      "Get Started",
      "Skip"
    );

    if (action === "Get Started") {
      await this.completeStep("welcome");
      this.deps.openWalkthrough?.();
    } else if (action === "Skip") {
      await this.skipOnboarding();
    }
  }
}

// --- Account snapshot builder ---

export function buildAccountSnapshot(
  userId: string | undefined,
  upgradeContext: UpgradeContext | undefined
): AccountSnapshot {
  if (!userId) {
    return {
      signedIn: false,
      userId: undefined,
      isPremium: false,
      remainingSessions: 0,
      displayName: undefined
    };
  }

  return {
    signedIn: true,
    userId,
    isPremium: upgradeContext?.isPremium ?? false,
    remainingSessions: upgradeContext?.remainingSessions ?? 0,
    displayName: undefined
  };
}

// --- Status bar state builder ---

export function buildStatusBarState(snapshot: AccountSnapshot): StatusBarState {
  if (!snapshot.signedIn) {
    return {
      text: "$(account) prmpt: Sign In",
      tooltip: "Click to sign in to prmpt",
      icon: "account",
      command: "prmpt.auth.signIn"
    };
  }

  if (snapshot.isPremium) {
    return {
      text: "$(check) prmpt: Premium",
      tooltip: "Premium subscription active — unlimited prompt optimization",
      icon: "check",
      command: undefined
    };
  }

  if (snapshot.remainingSessions <= 0) {
    return {
      text: "$(error) prmpt: Trial Ended",
      tooltip: "Free trial exhausted. Upgrade to Premium for unlimited use.",
      icon: "error",
      command: "prmpt.entitlement.upgrade"
    };
  }

  if (snapshot.remainingSessions <= 2) {
    return {
      text: `$(warning) prmpt: ${snapshot.remainingSessions} left`,
      tooltip: `${snapshot.remainingSessions} free session${snapshot.remainingSessions === 1 ? "" : "s"} remaining. Upgrade anytime.`,
      icon: "warning",
      command: "prmpt.entitlement.upgrade"
    };
  }

  return {
    text: `$(account) prmpt: ${snapshot.remainingSessions} left`,
    tooltip: `${snapshot.remainingSessions} free sessions remaining`,
    icon: "account",
    command: undefined
  };
}

// --- Message types extension ---

export const ONBOARDING_MESSAGE_TYPES = {
  ONBOARDING_STATE_REQUEST: "onboarding.state.request",
  ONBOARDING_STATE_RESPONSE: "onboarding.state.response",
  ONBOARDING_COMPLETE_STEP_REQUEST: "onboarding.completeStep.request",
  ONBOARDING_COMPLETE_STEP_RESPONSE: "onboarding.completeStep.response",
  ONBOARDING_SKIP_REQUEST: "onboarding.skip.request",
  ONBOARDING_SKIP_RESPONSE: "onboarding.skip.response",
  ACCOUNT_SNAPSHOT_REQUEST: "account.snapshot.request",
  ACCOUNT_SNAPSHOT_RESPONSE: "account.snapshot.response",
  ACCOUNT_STATE_CHANGED: "account.stateChanged"
} as const;

// --- Message handler factories ---

export function createOnboardingStateHandler(
  manager: OnboardingManager
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    const state = manager.getState();
    return createResponse(
      ONBOARDING_MESSAGE_TYPES.ONBOARDING_STATE_RESPONSE,
      state,
      envelope.correlationId
    );
  };
}

export function createOnboardingCompleteStepHandler(
  manager: OnboardingManager
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    const payload = envelope.payload as Record<string, unknown> | undefined;
    const step = payload?.step as OnboardingStep | undefined;

    if (!step || !ONBOARDING_STEPS.includes(step)) {
      return createResponse(
        ONBOARDING_MESSAGE_TYPES.ONBOARDING_COMPLETE_STEP_RESPONSE,
        { success: false, error: `Invalid onboarding step: ${String(step)}` },
        envelope.correlationId
      );
    }

    const state = await manager.completeStep(step);
    return createResponse(
      ONBOARDING_MESSAGE_TYPES.ONBOARDING_COMPLETE_STEP_RESPONSE,
      { success: true, state },
      envelope.correlationId
    );
  };
}

export function createOnboardingSkipHandler(
  manager: OnboardingManager
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    const state = await manager.skipOnboarding();
    return createResponse(
      ONBOARDING_MESSAGE_TYPES.ONBOARDING_SKIP_RESPONSE,
      { success: true, state },
      envelope.correlationId
    );
  };
}

export function createAccountSnapshotHandler(
  getSnapshot: () => AccountSnapshot
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope) => {
    const snapshot = getSnapshot();
    return createResponse(
      ONBOARDING_MESSAGE_TYPES.ACCOUNT_SNAPSHOT_RESPONSE,
      snapshot,
      envelope.correlationId
    );
  };
}

export function createAccountStateChangedEvent(snapshot: AccountSnapshot): MessageEnvelope {
  return createEvent(ONBOARDING_MESSAGE_TYPES.ACCOUNT_STATE_CHANGED, snapshot);
}
