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

