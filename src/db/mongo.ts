import { MongoClient, Database } from "../deps.ts";
import { getConfig } from "../utils/env.ts";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const { MONGO_URI, MONGO_DB } = await getConfig();

  console.log("Connecting to MongoDB...");
  console.log("Using URI:", MONGO_URI); // Debug line

  try {
    const client = new MongoClient();
    await client.connect(MONGO_URI);

    db = client.database(MONGO_DB);

    console.log(`✅ Connected to MongoDB database: ${MONGO_DB}`);
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}
