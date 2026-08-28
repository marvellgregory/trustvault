import type { EIP1193Provider } from "viem";

import type { CircleReadiness } from "../app-kit/circle-provider-binding";
import type { QualificationHarnessOutcome } from "./qualification-harness";
import type { RegistryProviderRecord } from "./provider-types";

export type QualificationExecutionPhase = "IDLE" | "PREFLIGHT" | "RUNNING" | "PASSED" | "FAILED" | "INVALIDATED";
export type QualificationCheckStatus = "PENDING" | "PASSED" | "FAILED";
export type QualificationCheckName =
  | "REGISTRY_ACTIVE" | "EXPLICIT_SELECTION" | "SELECTED_RECORD" | "NON_CONFLICTED"
  | "EXACT_PROVIDER" | "WAGMI_PROVIDER" | "IDENTITY_VERIFIED" | "ACCOUNT_MATCH"
  | "ARC_CHAIN" | "CIRCLE_READY" | "ACCOUNT_PREFLIGHT" | "GENERATION_CURRENT"
  | "FINAL_REVALIDATION";

export type QualificationCheckResult = Readonly<{
  name: QualificationCheckName;
  status: QualificationCheckStatus;
  message: string;
}>;

export type QualificationRuntimeEvidence = Readonly<{
  registryActive: boolean;
  registryGeneration: string;
  selectedRegistryId?: string;
  selectedRecord?: RegistryProviderRecord | null;
  activeWagmiProvider?: unknown;
  identityVerified: boolean;
  connected: boolean;
  verifiedAccount?: `0x${string}`;
  activeAccount?: `0x${string}`;
  chainId?: number;
  requiredChainId: number;
  circleStatus: CircleReadiness;
  circleProvider?: unknown;
  circleBindingGeneration?: string;
  qualificationGeneration: string;
  unsupportedNetworkObservation?: string;
}>;

export type QualificationExecutionSnapshot = Readonly<{
  phase: QualificationExecutionPhase;
  runId?: string;
  providerIdentityKey?: string;
  providerName?: string;
  registryGeneration?: string;
  qualificationGeneration?: string;
  account?: `0x${string}`;
  chainId?: number;
  circleBindingGeneration?: string;
  startedAt?: string;
  completedAt?: string;
  checks: readonly QualificationCheckResult[];
  reason?: string;
}>;

type RuntimeRun = Readonly<{
  runId: string;
  provider: EIP1193Provider;
  providerIdentityKey: string;
  registryGeneration: string;
  qualificationGeneration: string;
  account: `0x${string}`;
  chainId: number;
  circleBindingGeneration?: string;
}>;

export type QualificationExecutionController = Readonly<{
  getSnapshot(): QualificationExecutionSnapshot;
  subscribe(listener: () => void): () => void;
  run(input?: { unsupportedNetworkObservation?: string }): Promise<QualificationExecutionSnapshot>;
  invalidate(reason: string): QualificationExecutionSnapshot;
}>;

const CHECKS: readonly QualificationCheckName[] = Object.freeze([
  "REGISTRY_ACTIVE", "EXPLICIT_SELECTION", "SELECTED_RECORD", "NON_CONFLICTED",
  "EXACT_PROVIDER", "WAGMI_PROVIDER", "IDENTITY_VERIFIED", "ACCOUNT_MATCH",
  "ARC_CHAIN", "CIRCLE_READY", "ACCOUNT_PREFLIGHT", "GENERATION_CURRENT", "FINAL_REVALIDATION",
]);

const idleSnapshot = (): QualificationExecutionSnapshot => Object.freeze({ phase: "IDLE", checks: Object.freeze([]) });
const checksWith = (results: Partial<Record<QualificationCheckName, QualificationCheckResult>> = {}) =>
  Object.freeze(CHECKS.map((name) => results[name] ?? Object.freeze({ name, status: "PENDING" as const, message: "Not evaluated." })));
const check = (name: QualificationCheckName, passed: boolean, message: string): QualificationCheckResult =>
  Object.freeze({ name, status: passed ? "PASSED" : "FAILED", message });

function evaluateRuntime(runtime: QualificationRuntimeEvidence, run?: RuntimeRun) {
  const record = runtime.selectedRecord;
  const results: Partial<Record<QualificationCheckName, QualificationCheckResult>> = {};
  results.REGISTRY_ACTIVE = check("REGISTRY_ACTIVE", runtime.registryActive, runtime.registryActive ? "Authoritative registry is active." : "Authoritative registry is inactive.");
  results.EXPLICIT_SELECTION = check("EXPLICIT_SELECTION", Boolean(runtime.selectedRegistryId), runtime.selectedRegistryId ? "Explicit selection is present." : "Explicit selection is required.");
  results.SELECTED_RECORD = check("SELECTED_RECORD", Boolean(record), record ? "Selected record exists." : "Selected record is unavailable.");
  const nonConflicted = Boolean(record && record.state === "available" && record.conflicts.length === 0);
  results.NON_CONFLICTED = check("NON_CONFLICTED", nonConflicted, nonConflicted ? "Selected provider is non-conflicted." : "Selected provider is conflicted.");
  const selectionMatches = Boolean(record && record.identity.registryId === runtime.selectedRegistryId);
  const exactProvider = Boolean(record && (!run || record.provider === run.provider) && selectionMatches);
  results.EXACT_PROVIDER = check("EXACT_PROVIDER", exactProvider, exactProvider ? "Exact selected provider reference is current." : "Selected provider reference changed.");
  const wagmiMatches = Boolean(record && runtime.activeWagmiProvider === record.provider);
  results.WAGMI_PROVIDER = check("WAGMI_PROVIDER", wagmiMatches, wagmiMatches ? "Wagmi resolves the exact selected provider." : "Wagmi provider does not match selection.");
  results.IDENTITY_VERIFIED = check("IDENTITY_VERIFIED", runtime.identityVerified, runtime.identityVerified ? "Provider identity is verified." : "Provider identity is unverified.");
  const accountMatches = Boolean(runtime.connected && runtime.verifiedAccount && runtime.activeAccount && runtime.verifiedAccount.toLowerCase() === runtime.activeAccount.toLowerCase() && (!run || runtime.activeAccount.toLowerCase() === run.account.toLowerCase()));
  results.ACCOUNT_MATCH = check("ACCOUNT_MATCH", accountMatches, accountMatches ? "Connected account is consistent." : "Connected account is missing or changed.");
  const arcReady = !runtime.unsupportedNetworkObservation && runtime.chainId === runtime.requiredChainId && (!run || runtime.chainId === run.chainId);
  results.ARC_CHAIN = check("ARC_CHAIN", arcReady, arcReady ? "Arc Testnet is current." : runtime.unsupportedNetworkObservation ? `Unsupported network observed: ${runtime.unsupportedNetworkObservation}` : "Arc Testnet is not current.");
  const circleReady = Boolean(runtime.circleStatus === "CIRCLE_READY" && record && runtime.circleProvider === record.provider && (!run || runtime.circleBindingGeneration === run.circleBindingGeneration));
  results.CIRCLE_READY = check("CIRCLE_READY", circleReady, circleReady ? "Circle binding is ready for the exact provider." : "Circle binding is not ready or changed.");
  const generationCurrent = Boolean(!run || (runtime.registryGeneration === run.registryGeneration && runtime.qualificationGeneration === run.qualificationGeneration));
  results.GENERATION_CURRENT = check("GENERATION_CURRENT", generationCurrent, generationCurrent ? "Runtime generations are current." : "Runtime generation changed.");
  const passed = Object.values(results).every((result) => result.status === "PASSED");
  return { results, passed };
}

export function createQualificationExecutionController(input: {
  enabled: boolean;
  getRuntimeEvidence: () => Promise<QualificationRuntimeEvidence>;
  recordEvidence: (entry: { provider: object; providerIdentityKey: string; qualificationGeneration: string; outcome: QualificationHarnessOutcome; reasons: readonly string[]; suiteVersion: string }) => unknown;
  createRunId?: () => string;
  now?: () => string;
}): QualificationExecutionController {
  let snapshot = idleSnapshot();
  let activeRun: RuntimeRun | null = null;
  let sequence = 0;
  const listeners = new Set<() => void>();
  const now = input.now ?? (() => new Date().toISOString());
  const publish = (next: QualificationExecutionSnapshot) => {
    snapshot = Object.freeze({ ...next, checks: Object.freeze([...next.checks]) });
    listeners.forEach((listener) => listener());
    return snapshot;
  };
  const terminal = (phase: "FAILED" | "INVALIDATED", reason: string, results: Partial<Record<QualificationCheckName, QualificationCheckResult>>, run?: RuntimeRun) => {
    if (run) input.recordEvidence({ provider: run.provider, providerIdentityKey: run.providerIdentityKey, qualificationGeneration: run.qualificationGeneration, outcome: phase, reasons: [reason], suiteVersion: "wallet-qualification-execution-v1" });
    activeRun = null;
    return publish({ ...snapshot, phase, completedAt: now(), checks: checksWith(results), reason });
  };

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async run(runInput) {
      if (!input.enabled) return publish({ phase: "FAILED", completedAt: now(), checks: Object.freeze([]), reason: "Qualification execution is unavailable outside development." });
      const mySequence = ++sequence;
      const runId = input.createRunId?.() ?? crypto.randomUUID();
      publish({ phase: "PREFLIGHT", runId, startedAt: now(), checks: checksWith() });
      const initial = { ...(await input.getRuntimeEvidence()), unsupportedNetworkObservation: runInput?.unsupportedNetworkObservation };
      if (mySequence !== sequence) return snapshot;
      const record = initial.selectedRecord;
      if (!record || !initial.activeAccount || initial.chainId === undefined) return terminal("FAILED", "A selected, connected provider is required.", evaluateRuntime(initial).results);
      const run: RuntimeRun = Object.freeze({ runId, provider: record.provider, providerIdentityKey: record.identity.registryId, registryGeneration: initial.registryGeneration, qualificationGeneration: initial.qualificationGeneration, account: initial.activeAccount, chainId: initial.chainId, circleBindingGeneration: initial.circleBindingGeneration });
      activeRun = run;
      let evaluated = evaluateRuntime(initial, run);
      if (!evaluated.passed) return terminal("FAILED", initial.unsupportedNetworkObservation ? `Unsupported network observed: ${initial.unsupportedNetworkObservation}` : "Qualification preflight failed.", evaluated.results, run);
      publish({ phase: "RUNNING", runId, providerIdentityKey: run.providerIdentityKey, providerName: record.identity.name, registryGeneration: run.registryGeneration, qualificationGeneration: run.qualificationGeneration, account: run.account, chainId: run.chainId, circleBindingGeneration: run.circleBindingGeneration, startedAt: snapshot.startedAt, checks: checksWith(evaluated.results) });
      let accounts: unknown;
      try {
        accounts = await run.provider.request({ method: "eth_accounts" });
      } catch (error) {
        if (mySequence !== sequence || activeRun?.runId !== runId) return snapshot;
        const message = error instanceof Error ? error.message : "Authorized account preflight failed.";
        evaluated.results.ACCOUNT_PREFLIGHT = check("ACCOUNT_PREFLIGHT", false, message);
        return terminal("FAILED", message, evaluated.results, run);
      }
      if (mySequence !== sequence || activeRun?.runId !== runId) return snapshot;
      const accountPreflight = Array.isArray(accounts) && accounts.some((account) => typeof account === "string" && account.toLowerCase() === run.account.toLowerCase());
      evaluated.results.ACCOUNT_PREFLIGHT = check("ACCOUNT_PREFLIGHT", accountPreflight, accountPreflight ? "Authorized account preflight passed without prompting." : "Authorized account preflight failed.");
      if (!accountPreflight) return terminal("FAILED", "Authorized account preflight failed.", evaluated.results, run);
      const current = { ...(await input.getRuntimeEvidence()), unsupportedNetworkObservation: runInput?.unsupportedNetworkObservation };
      if (mySequence !== sequence || activeRun?.runId !== runId) return snapshot;
      evaluated = evaluateRuntime(current, run);
      evaluated.results.ACCOUNT_PREFLIGHT = check("ACCOUNT_PREFLIGHT", true, "Authorized account preflight passed without prompting.");
      if (!evaluated.passed) return terminal("INVALIDATED", "Runtime evidence changed during qualification.", evaluated.results, run);
      const finalRuntime = { ...(await input.getRuntimeEvidence()), unsupportedNetworkObservation: runInput?.unsupportedNetworkObservation };
      if (mySequence !== sequence || activeRun?.runId !== runId) return snapshot;
      const finalEvaluation = evaluateRuntime(finalRuntime, run);
      Object.assign(finalEvaluation.results, { ACCOUNT_PREFLIGHT: check("ACCOUNT_PREFLIGHT", true, "Authorized account preflight passed without prompting."), FINAL_REVALIDATION: check("FINAL_REVALIDATION", finalEvaluation.passed, finalEvaluation.passed ? "Final exact-provider evidence is current." : "Final runtime evidence changed.") });
      if (!finalEvaluation.passed) return terminal("INVALIDATED", "Final runtime revalidation failed.", finalEvaluation.results, run);
      input.recordEvidence({ provider: run.provider, providerIdentityKey: run.providerIdentityKey, qualificationGeneration: run.qualificationGeneration, outcome: "PASSED", reasons: [], suiteVersion: "wallet-qualification-execution-v1" });
      activeRun = null;
      return publish({ ...snapshot, phase: "PASSED", completedAt: now(), checks: checksWith(finalEvaluation.results), reason: undefined });
    },
    invalidate(reason) {
      sequence += 1;
      const run = activeRun;
      if (run) input.recordEvidence({ provider: run.provider, providerIdentityKey: run.providerIdentityKey, qualificationGeneration: run.qualificationGeneration, outcome: "INVALIDATED", reasons: [reason], suiteVersion: "wallet-qualification-execution-v1" });
      activeRun = null;
      return publish({ ...snapshot, phase: "INVALIDATED", completedAt: now(), reason });
    },
  });
}
