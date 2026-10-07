import { createClient } from "@supabase/supabase-js";
import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

function configured(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function mcpUserId(ctx: ToolContext): string {
  const userId = ctx.getUserId();
  if (!ctx.isAuthenticated() || !userId) throw new ToolError("Entre na sua conta para consultar os dados.");
  return userId;
}

function configuration() {
  const url = configured(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  let key = configured(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (!key) {
    try {
      const keys: unknown = JSON.parse(process.env['SUPABASE_PUBLISHABLE_KEYS'] ?? "{}");
      if (keys && typeof keys === "object" && !Array.isArray(keys)) {
        key = Object.values(keys).find((value): value is string => typeof value === "string" && value.startsWith("sb_publishable_"));
      }
    } catch { /* Try legacy configuration below. */ }
  }
  key ??= configured(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (!url || !key) throw new ToolError("A conexão com os dados não está configurada.");
  return { url, key };
}

export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!ctx.isAuthenticated() || !token || !ctx.getUserId()) throw new ToolError("Entre na sua conta para consultar os dados.");
  const { url, key } = configuration();
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
