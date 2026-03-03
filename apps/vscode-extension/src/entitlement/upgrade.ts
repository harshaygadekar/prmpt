import type { EntitlementClient, EntitlementStatus } from "./client.js";
import { formatUserError, getUserFacingMessage } from "./errors.js";

export type UpgradeState =
  | "active_trial"
  | "trial_warning"
  | "trial_exhausted"
  | "checkout_pending"
  | "checkout_failed"
  | "premium_active"
  | "entitlement_error";

export interface UpgradeContext {
  state: UpgradeState;
  remainingSessions?: number;
  isPremium: boolean;
  errorCode?: string;
  errorMessage?: string;
}

const TRIAL_WARNING_THRESHOLD = 2;

export interface UpgradeManagerDeps {
  client: EntitlementClient;
  openExternal: (url: string) => Promise<boolean>;
  showInfo: (message: string) => void;
  showWarning: (message: string, ...actions: string[]) => Promise<string | undefined>;
  showError: (message: string) => void;
}

export function createUpgradeManager(deps: UpgradeManagerDeps) {
  let lastContext: UpgradeContext = {
    state: "active_trial",
    isPremium: false
  };

  async function checkStatus(userId: string): Promise<UpgradeContext> {
    try {
      const entitlement = await deps.client.getEntitlement(userId);
      lastContext = resolveContext(entitlement);
      return lastContext;
    } catch (error) {
      const code = isEntitlementClientError(error) ? error.errorCode : "network_error";
      lastContext = {
        state: "entitlement_error",
        isPremium: false,
        errorCode: code,
        errorMessage: getUserFacingMessage(code)
      };
      return lastContext;
    }
  }

  async function checkUsageAndPrompt(
    userId: string,
    remainingSessions: number
  ): Promise<UpgradeContext> {
    if (remainingSessions <= 0) {
      lastContext = {
        state: "trial_exhausted",
        remainingSessions: 0,
        isPremium: false
      };
      await promptUpgrade(userId);
      return lastContext;
    }

    if (remainingSessions <= TRIAL_WARNING_THRESHOLD) {
      lastContext = {
        state: "trial_warning",
        remainingSessions,
        isPremium: false
      };
      void deps.showWarning(
        `You have ${remainingSessions} free session${remainingSessions === 1 ? "" : "s"} remaining.`
      );
      return lastContext;
    }

    lastContext = {
      state: "active_trial",
      remainingSessions,
      isPremium: false
    };
    return lastContext;
  }

  async function promptUpgrade(userId: string): Promise<void> {
    const action = await deps.showWarning(
      getUserFacingMessage("trial_exhausted"),
      "Upgrade Now",
      "Dismiss"
    );
    if (action !== "Upgrade Now") return;

    try {
      lastContext = { ...lastContext, state: "checkout_pending" };
      const checkout = await deps.client.startCheckout(userId);
      await deps.openExternal(checkout.checkoutUrl);
      deps.showInfo(
        "Checkout opened in your browser. After payment, use 'prmpt: Refresh Subscription' to activate Premium."
      );
    } catch (error) {
      const code = isEntitlementClientError(error) ? error.errorCode : "checkout_failed";
      lastContext = {
        state: "checkout_failed",
        isPremium: false,
        errorCode: code,
        errorMessage: formatUserError(code)
      };
      deps.showError(formatUserError(code));
    }
  }

  async function refreshEntitlement(userId: string): Promise<UpgradeContext> {
    try {
      const entitlement = await deps.client.getEntitlement(userId, { forceRefresh: true });
      lastContext = resolveContext(entitlement);
      if (lastContext.isPremium) {
        deps.showInfo(
          "Premium subscription active! You now have unlimited prompt optimization."
        );
      } else {
        deps.showInfo("Subscription status refreshed. Trial plan active.");
      }
      return lastContext;
    } catch (error) {
      const code = isEntitlementClientError(error)
        ? error.errorCode
        : "entitlement_refresh_failed";
      lastContext = {
        state: "entitlement_error",
        isPremium: false,
        errorCode: code,
        errorMessage: formatUserError(code)
      };
      deps.showError(formatUserError(code));
      return lastContext;
    }
  }

  function getLastContext(): UpgradeContext {
    return lastContext;
  }

  return {
    checkStatus,
    checkUsageAndPrompt,
    promptUpgrade,
    refreshEntitlement,
    getLastContext
  };
}

export type UpgradeManager = ReturnType<typeof createUpgradeManager>;

function resolveContext(entitlement: EntitlementStatus): UpgradeContext {
  if (entitlement.isPremium) {
    return { state: "premium_active", isPremium: true };
  }
  return { state: "active_trial", isPremium: false };
}

function isEntitlementClientError(
  error: unknown
): error is { errorCode: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "errorCode" in error &&
    typeof (error as Record<string, unknown>).errorCode === "string"
  );
}
