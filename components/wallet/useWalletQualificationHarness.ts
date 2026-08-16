"use client";

import { useSyncExternalStore } from "react";

import {
  developmentQualificationHarness,
  toWalletQualificationEvidence,
} from "@/lib/wallet/qualification-harness";

export function useWalletQualificationHarness(provider: object | undefined, generation: string) {
  const evidence = useSyncExternalStore(
    developmentQualificationHarness.subscribe,
    () => developmentQualificationHarness.getEvidence(provider, generation),
    () => null,
  );
  return toWalletQualificationEvidence(evidence);
}
