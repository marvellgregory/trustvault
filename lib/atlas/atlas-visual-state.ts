import {
  getAtlasRouteContext,
  type AtlasRouteContextKind,
} from "./atlas-route-context.js";

export const ATLAS_VISUAL_STATES = [
  "idle",
  "greeting",
  "listening",
  "thinking",
  "speaking",
  "success",
  "warning",
  "error",
  "support",
  "celebrating",
] as const;

export type AtlasVisualState = (typeof ATLAS_VISUAL_STATES)[number];

export type AtlasVisualMotionHook =
  | "breathing"
  | "blink"
  | "head-movement"
  | "low-glow"
  | "focused"
  | "pulse"
  | "scan"
  | "speech-ripple"
  | "restrained-celebration"
  | "attentive"
  | "concerned"
  | "support-handoff";

export type AtlasVisualStateDefinition = {
  state: AtlasVisualState;
  tone: "neutral" | "warm" | "focused" | "positive" | "caution" | "helpful";
  motionHooks: readonly AtlasVisualMotionHook[];
  automatic: boolean;
};

export const ATLAS_VISUAL_STATE_DEFINITIONS: Record<
  AtlasVisualState,
  AtlasVisualStateDefinition
> = {
  idle: {
    state: "idle",
    tone: "neutral",
    motionHooks: ["breathing", "blink", "head-movement", "low-glow"],
    automatic: true,
  },
  greeting: {
    state: "greeting",
    tone: "warm",
    motionHooks: ["blink", "head-movement"],
    automatic: true,
  },
  listening: {
    state: "listening",
    tone: "focused",
    motionHooks: ["attentive"],
    automatic: true,
  },
  thinking: {
    state: "thinking",
    tone: "focused",
    motionHooks: ["focused", "pulse", "scan"],
    automatic: true,
  },
  speaking: {
    state: "speaking",
    tone: "helpful",
    motionHooks: ["speech-ripple"],
    automatic: true,
  },
  success: {
    state: "success",
    tone: "positive",
    motionHooks: ["low-glow"],
    automatic: true,
  },
  warning: {
    state: "warning",
    tone: "caution",
    motionHooks: ["attentive"],
    automatic: true,
  },
  error: {
    state: "error",
    tone: "helpful",
    motionHooks: ["concerned"],
    automatic: true,
  },
  support: {
    state: "support",
    tone: "helpful",
    motionHooks: ["support-handoff"],
    automatic: true,
  },
  celebrating: {
    state: "celebrating",
    tone: "positive",
    motionHooks: ["restrained-celebration"],
    automatic: false,
  },
};

export type AtlasSurfaceState = "collapsed" | "expanded";

export type AtlasSurfaceContract = {
  state: AtlasSurfaceState;
  placement: "bottom-right";
  mascotVisible: true;
  mascotAttachedToSurface: true;
};

export function getAtlasSurfaceContract(
  state: AtlasSurfaceState,
): AtlasSurfaceContract {
  return {
    state,
    placement: "bottom-right",
    mascotVisible: true,
    mascotAttachedToSurface: true,
  };
}

export type AtlasVisualMode = AtlasRouteContextKind;

export type AtlasVisualContext = {
  mode: AtlasVisualMode;
  calm: boolean;
  restrained: boolean;
  warm: boolean;
  celebrationEligible: boolean;
};

export type AtlasVisualEvent =
  | "reset"
  | "page-enter"
  | "listen"
  | "think"
  | "speak"
  | "confirmed-success"
  | "celebrate-confirmed-success"
  | "warn"
  | "fail"
  | "escalate-support";

export function getAtlasVisualContext(route: string): AtlasVisualContext {
  const mode = getAtlasRouteContext(route).kind;
  const isPayment = mode === "payment-review";
  const isTrust = mode === "trust-center";

  return {
    mode,
    calm: isPayment || isTrust || mode === "support",
    restrained: isPayment || isTrust,
    warm: mode === "gift-vault" || mode === "marketplace",
    celebrationEligible: !isPayment && !isTrust && mode !== "support",
  };
}

export function canCelebrate(context: AtlasVisualContext): boolean {
  return context.celebrationEligible && !context.restrained;
}

export function getAtlasVisualState(
  event: AtlasVisualEvent,
  context: AtlasVisualContext,
): AtlasVisualState {
  if (event === "escalate-support") return "support";
  if (event === "fail") return "error";
  if (event === "warn") return "warning";
  if (event === "listen") return "listening";
  if (event === "think") return "thinking";
  if (event === "speak") return "speaking";
  if (event === "confirmed-success") return "success";
  if (event === "celebrate-confirmed-success") {
    return canCelebrate(context) ? "celebrating" : "success";
  }
  if (event === "page-enter") {
    return context.mode === "support" ? "support" : "greeting";
  }
  return "idle";
}
