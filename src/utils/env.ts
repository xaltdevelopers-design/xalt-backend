import { loadEnv } from "../deps.ts";
// @ts-ignore: Deno namespace is available at runtime; declare for typechecking
// deno-lint-ignore no-explicit-any
declare const Deno: any;

interface AppConfig {
  MONGO_URI: string;
  MONGO_DB: string;
  PORT: number;
  JWT_SECRET: string;
}

let cached: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {

  if (cached) return cached;

  // Gracefully attempt to load .env; allow empty values so absence of .env doesn't crash.
  let loaded: Record<string, string> = {};
  try {
    // Explicitly point to project-root .env and export into Deno.env so Deno.env.get works
    loaded = await loadEnv({ envPath: ".env", export: true, allowEmptyValues: true });
  } catch (_e) {
    // If dotenv loading fails (e.g., due to example enforcement), continue with defaults.
    loaded = {};
  }
  // Avoid leaking secrets; only log which expected keys are present
  const presentKeys = ["MONGO_URI", "MONGO_DB", "PORT", "JWT_SECRET", "MONGO_URI_NON_SRV"].filter(
    (k) => (typeof Deno !== "undefined" && Deno.env?.get?.(k)) || loaded[k]
  );

  const pick = (k: string) => (typeof Deno !== "undefined" && Deno.env?.get?.(k)) || loaded[k] || "";

  const MONGO_URI = (pick("MONGO_URI").trim()) || "mongodb://localhost:27017";
  const MONGO_DB = (pick("MONGO_DB").trim()) || "xolt";
  const PORT = parseInt((pick("PORT").trim()) || "8000", 10);
  const JWT_SECRET = (pick("JWT_SECRET").trim()) || "change-me-dev";

  cached = { MONGO_URI, MONGO_DB, PORT, JWT_SECRET };
  return cached;
}
