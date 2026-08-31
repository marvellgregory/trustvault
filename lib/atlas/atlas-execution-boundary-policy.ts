import type {
  AtlasExecutionHandoff,
} from "./atlas-transaction-execution-handoff";

export const ATLAS_EXECUTION_BOUNDARY_VERSION =
  1 as const;

export type AtlasExecutionBoundaryEnvelope =
  Readonly<{
    version:
      typeof ATLAS_EXECUTION_BOUNDARY_VERSION;
    handoff:
      Readonly<AtlasExecutionHandoff>;
    authority:
      "EXTERNAL_USER_WALLET";
  }>;

function cloneExecutionHandoff(
  handoff: AtlasExecutionHandoff,
): Readonly<AtlasExecutionHandoff> {
  return Object.freeze({
    ...handoff,
    asset: Object.freeze({
      ...handoff.asset,
    }),
    destination: Object.freeze({
      ...handoff.destination,
    }),
    source: Object.freeze({
      ...handoff.source,
    }),
  });
}

export function createAtlasExecutionBoundaryEnvelope(
  handoff: AtlasExecutionHandoff,
): AtlasExecutionBoundaryEnvelope {
  return Object.freeze({
    version:
      ATLAS_EXECUTION_BOUNDARY_VERSION,
    handoff:
      cloneExecutionHandoff(handoff),
    authority:
      "EXTERNAL_USER_WALLET",
  });
}