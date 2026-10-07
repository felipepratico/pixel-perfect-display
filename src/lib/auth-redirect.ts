export function safeAuthNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/painel";
  try {
    const url = new URL(value, "https://app.invalid");
    if (url.origin !== "https://app.invalid" || url.pathname === "/auth") return "/painel";
    return url.pathname + url.search + url.hash;
  } catch { return "/painel"; }
}
