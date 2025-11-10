import { loadEnv } from "../deps.ts";

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
    loaded = await loadEnv({ export: true, allowEmptyValues: true });
  } catch (_e) {
    // If dotenv loading fails (e.g., due to example enforcement), continue with defaults.
    loaded = {};
  }

  const MONGO_URI = loaded.MONGO_URI && loaded.MONGO_URI.length > 0
    ? loaded.MONGO_URI
    : "mongodb://localhost:27017";
  const MONGO_DB = loaded.MONGO_DB && loaded.MONGO_DB.length > 0 ? loaded.MONGO_DB : "xolt";
  const PORT = parseInt(loaded.PORT && loaded.PORT.length > 0 ? loaded.PORT : "8000", 10);
  const JWT_SECRET = loaded.JWT_SECRET && loaded.JWT_SECRET.length > 0
    ? loaded.JWT_SECRET
    : "change-me-dev";

  cached = { MONGO_URI, MONGO_DB, PORT, JWT_SECRET };
  return cached;
}
