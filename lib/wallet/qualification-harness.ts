import type { WalletQualificationEvidenceV1 } from "./wallet-qualification";

export type QualificationHarnessOutcome =
  | "NOT_TESTED"
  | "IN_PROGRESS"
  | "PASSED"
  | "FAILED"
  | "INVALIDATED";

export type QualificationHarnessEvidence = Readonly<{
  outcome: QualificationHarnessOutcome;
  providerIdentityKey: string;
  qualificationGeneration: string;
  evaluatedAt: string;
  suiteVersion?: string;
  reasons: readonly string[];
}>;

type EvidenceByGeneration = Map<string, QualificationHarnessEvidence>;

export type QualificationHarness = Readonly<{
  getEvidence(provider: object | undefined, generation: string): QualificationHarnessEvidence | null;
  record(input: {
    provider: object;
    providerIdentityKey: string;
    qualificationGeneration: string;
    outcome: QualificationHarnessOutcome;
    evaluatedAt?: string;
    suiteVersion?: string;
    reasons?: readonly string[];
  }): QualificationHarnessEvidence;
  invalidate(provider: object, generation: string, reason: string): QualificationHarnessEvidence | null;
  subscribe(listener: () => void): () => void;
}>;

export function createQualificationHarness(options: { recordingEnabled: boolean }): QualificationHarness {
  const evidence = new WeakMap<object, EvidenceByGeneration>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  return Object.freeze({
    getEvidence(provider, generation) {
      if (!provider || !generation) return null;
      return evidence.get(provider)?.get(generation) ?? null;
    },
    record(input) {
      if (!options.recordingEnabled) throw new Error("Qualification recording is disabled in production.");
      if (!input.provider || !input.providerIdentityKey || !input.qualificationGeneration) throw new Error("Exact provider identity and runtime generation are required.");
      const next = Object.freeze({
        outcome: input.outcome,
        providerIdentityKey: input.providerIdentityKey,
        qualificationGeneration: input.qualificationGeneration,
        evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
        ...(input.suiteVersion ? { suiteVersion: input.suiteVersion } : {}),
        reasons: Object.freeze([...(input.reasons ?? [])]),
      });
      const byGeneration = evidence.get(input.provider) ?? new Map<string, QualificationHarnessEvidence>();
      byGeneration.set(input.qualificationGeneration, next);
      evidence.set(input.provider, byGeneration);
      notify();
      return next;
    },
    invalidate(provider, generation, reason) {
      const current = evidence.get(provider)?.get(generation);
      if (!current) return null;
      const next = Object.freeze({ ...current, outcome: "INVALIDATED" as const, evaluatedAt: new Date().toISOString(), reasons: Object.freeze([reason]) });
      evidence.get(provider)?.set(generation, next);
      notify();
      return next;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}

export function toWalletQualificationEvidence(evidence: QualificationHarnessEvidence | null): WalletQualificationEvidenceV1 | null {
  if (!evidence || evidence.outcome === "NOT_TESTED" || evidence.outcome === "IN_PROGRESS") return null;
  return Object.freeze({
    status: evidence.outcome === "PASSED" ? "QUALIFIED" : evidence.outcome === "FAILED" ? "INCOMPATIBLE" : "TEST_REQUIRED",
    providerIdentityKey: evidence.providerIdentityKey,
    qualificationGeneration: evidence.qualificationGeneration,
    evaluatedAt: evidence.evaluatedAt,
    ...(evidence.suiteVersion ? { suiteVersion: evidence.suiteVersion } : {}),
    reasons: Object.freeze([...evidence.reasons]),
  });
}

// Internal lab instrumentation only. Production builds reject all recording calls.
export const developmentQualificationHarness = createQualificationHarness({ recordingEnabled: process.env.NODE_ENV !== "production" });
