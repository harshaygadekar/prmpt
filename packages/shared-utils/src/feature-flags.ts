/**
 * Feature Flag System (ST-10-04)
 *
 * Provides safe rollout controls for P1 features (F7/F8/F9).
 * Flags can be resolved from local config, remote config, or defaults.
 * P0 control paths are never affected when flags are disabled.
 */

// --- Flag definitions ---

export type FeatureFlagId =
  | "technique_selector"   // F7
  | "quality_score"        // F8
  | "context_injector";    // F9

export type FlagState = "enabled" | "disabled" | "preview";

export interface FeatureFlagDescriptor {
  id: FeatureFlagId;
  label: string;
  description: string;
  defaultState: FlagState;
  /** Minimum extension version required (semver) */
  minVersion: string;
  /** Feature tier gate */
  tier: "free" | "premium" | "all";
}

const FLAG_REGISTRY: Record<FeatureFlagId, FeatureFlagDescriptor> = {
  technique_selector: {
    id: "technique_selector",
    label: "Technique Selector (F7)",
    description: "User-selectable prompt optimization techniques with model-family compatibility.",
    defaultState: "enabled",
    minVersion: "0.1.0",
    tier: "all"
  },
  quality_score: {
    id: "quality_score",
    label: "Quality Score (F8)",
    description: "Full weighted scoring rubric with actionable suggestions and confidence metadata.",
    defaultState: "enabled",
    minVersion: "0.1.0",
    tier: "all"
  },
  context_injector: {
    id: "context_injector",
    label: "Context Injector (F9)",
    description: "Inject file, selection, and git diff context into prompt optimization.",
    defaultState: "preview",
    minVersion: "0.1.0",
    tier: "all"
  }
};

// --- Flag config source ---

export interface FlagOverrides {
  [key: string]: FlagState;
}

export interface FlagResolverConfig {
  /** Local overrides from VS Code settings or env vars */
  localOverrides?: FlagOverrides | undefined;
  /** Remote overrides from config endpoint (optional) */
  remoteOverrides?: FlagOverrides | undefined;
  /** Current extension version for version gating */
  extensionVersion?: string | undefined;
  /** Whether user is premium (for tier gating) */
  isPremium?: boolean | undefined;
}

// --- Flag resolver ---

export class FeatureFlagResolver {
  private config: FlagResolverConfig;

  constructor(config: FlagResolverConfig = {}) {
    this.config = config;
  }

  /**
   * Resolve the effective state of a feature flag.
   * Priority: remoteOverrides > localOverrides > defaultState
   */
  resolve(flagId: FeatureFlagId): FlagState {
    const descriptor = FLAG_REGISTRY[flagId];

    // Check remote overrides first (highest priority)
    const remoteState = this.config.remoteOverrides?.[flagId];
    if (remoteState !== undefined && isValidFlagState(remoteState)) {
      return remoteState;
    }

    // Check local overrides
    const localState = this.config.localOverrides?.[flagId];
    if (localState !== undefined && isValidFlagState(localState)) {
      return localState;
    }

    // Default
    return descriptor.defaultState;
  }

  /**
   * Check if a feature is effectively enabled (enabled or preview).
   */
  isEnabled(flagId: FeatureFlagId): boolean {
    const state = this.resolve(flagId);
    return state === "enabled" || state === "preview";
  }

  /**
   * Check if a feature is in preview mode (soft launch).
   */
  isPreview(flagId: FeatureFlagId): boolean {
    return this.resolve(flagId) === "preview";
  }

  /**
   * Get all flag states for audit/debugging.
   */
  getAllStates(): Record<FeatureFlagId, FlagState> {
    const result: Partial<Record<FeatureFlagId, FlagState>> = {};
    for (const flagId of listFeatureFlags()) {
      result[flagId] = this.resolve(flagId);
    }
    return result as Record<FeatureFlagId, FlagState>;
  }

  /**
   * Update local overrides at runtime.
   */
  setLocalOverride(flagId: FeatureFlagId, state: FlagState): void {
    if (!this.config.localOverrides) {
      this.config.localOverrides = {};
    }
    this.config.localOverrides[flagId] = state;
  }

  /**
   * Remove a local override, falling back to remote or default.
   */
  clearLocalOverride(flagId: FeatureFlagId): void {
    if (this.config.localOverrides) {
      delete this.config.localOverrides[flagId]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
    }
  }

  /**
   * Update remote overrides (e.g., from config endpoint).
   */
  setRemoteOverrides(overrides: FlagOverrides): void {
    this.config.remoteOverrides = overrides;
  }
}

// --- Utilities ---

export function getFeatureFlag(flagId: FeatureFlagId): FeatureFlagDescriptor {
  return FLAG_REGISTRY[flagId];
}

export function listFeatureFlags(): FeatureFlagId[] {
  return Object.keys(FLAG_REGISTRY) as FeatureFlagId[];
}

export function isFeatureFlagId(value: string): value is FeatureFlagId {
  return value in FLAG_REGISTRY;
}

function isValidFlagState(value: string): value is FlagState {
  return value === "enabled" || value === "disabled" || value === "preview";
}

// --- Guard helper for conditional feature execution ---

export function withFeatureFlag<T>(
  resolver: FeatureFlagResolver,
  flagId: FeatureFlagId,
  enabledFn: () => T,
  disabledFn: () => T
): T {
  return resolver.isEnabled(flagId) ? enabledFn() : disabledFn();
}
