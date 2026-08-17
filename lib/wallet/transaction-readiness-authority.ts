import type { TransactionReadiness } from "./wallet-qualification";

export type TransactionReadinessAuthority = Readonly<{
  assertCurrent(): Promise<TransactionReadiness>;
}>;

export function createTransactionReadinessAuthority(evaluate: () => Promise<TransactionReadiness>): TransactionReadinessAuthority {
  return Object.freeze({
    async assertCurrent() {
      const current = await evaluate();
      if (current.status !== "TRANSACTION_READY") throw new Error(current.reasons[0] ?? "Current wallet transaction readiness is required.");
      return current;
    },
  });
}
