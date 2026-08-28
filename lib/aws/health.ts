export type TrustVaultAwsHealth = {
  ok: boolean;
  service: string;
  environment: string;
  database: string;
  databaseConnected: boolean;
  timestamp?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL?.replace(/\/$/, "");

export async function fetchTrustVaultAwsHealth(): Promise<TrustVaultAwsHealth> {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL is not configured."
    );
  }

  const response = await fetch(`${API_BASE_URL}/health`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `TrustVault AWS health check failed with HTTP ${response.status}.`
    );
  }

  const data = (await response.json()) as TrustVaultAwsHealth;

  if (!data.ok || !data.databaseConnected) {
    throw new Error("TrustVault AWS backend is not healthy.");
  }

  return data;
}
