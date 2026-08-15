import type {
  Eip6963ProviderInfo,
  SerializableProviderIdentity,
} from "./provider-types.js";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RDNS_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const SAFE_ICON_PATTERN =
  /^data:image\/(?:png|jpeg|webp|gif|avif);base64,[a-z0-9+/]+=*$/i;
const MAX_NAME_LENGTH = 64;
const MAX_ICON_LENGTH = 100_000;

export function normalizeProviderUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  return UUID_V4_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeProviderRdns(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  const labels = normalized.split(".");

  if (
    normalized.length > 253 ||
    labels.length < 2 ||
    labels.some((label) => !RDNS_LABEL_PATTERN.test(label))
  ) {
    return null;
  }

  return normalized;
}

export function sanitizeProviderName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();

  return normalized || null;
}

export function normalizeProviderIcon(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    value.length > MAX_ICON_LENGTH ||
    !SAFE_ICON_PATTERN.test(value)
  ) {
    return undefined;
  }

  return value;
}

export function normalizeProviderMetadata(
  value: unknown,
): Eip6963ProviderInfo | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<Record<keyof Eip6963ProviderInfo, unknown>>;
  const uuid = normalizeProviderUuid(candidate.uuid);
  const rdns = normalizeProviderRdns(candidate.rdns);
  const name = sanitizeProviderName(candidate.name);

  if (!uuid || !rdns || !name) return null;

  return Object.freeze({
    uuid,
    rdns,
    name,
    icon: normalizeProviderIcon(candidate.icon) ?? "",
  });
}

export function createSerializableProviderIdentity(
  info: Eip6963ProviderInfo,
): SerializableProviderIdentity {
  return Object.freeze({
    registryId: `eip6963:${info.uuid}`,
    source: "eip6963",
    uuid: info.uuid,
    rdns: info.rdns,
    name: info.name,
    ...(info.icon ? { icon: info.icon } : {}),
  });
}

export function isSameProviderIdentity(
  left: SerializableProviderIdentity,
  right: SerializableProviderIdentity,
): boolean {
  return (
    left.registryId === right.registryId &&
    left.source === right.source &&
    left.uuid === right.uuid &&
    left.rdns === right.rdns
  );
}
