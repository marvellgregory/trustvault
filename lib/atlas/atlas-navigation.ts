export function isSafeInternalRoute(route: string): boolean {
  if (!route.startsWith("/") || route.startsWith("//")) return false;
  if (route.includes("\\") || /[\u0000-\u001f\u007f]/.test(route)) return false;

  try {
    const parsed = new URL(route, "https://trustvault.local");
    return parsed.origin === "https://trustvault.local";
  } catch {
    return false;
  }
}

export function isControlledArcScanTransactionUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === "https://testnet.arcscan.app" &&
      /^\/tx\/0x[a-fA-F0-9]{64}$/.test(url.pathname) &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}
