import { getConfig } from "./utils/env.ts";
import { startServer } from "./server.ts";
import { getDb } from "./db/mongo.ts";

const { PORT } = await getConfig();
await getDb(); // Force DB connection and log at startup
await startServer(PORT);
