import { MongoClient } from "../deps.ts";
import { getConfig } from "../utils/env.ts";

let db: any = null;

export async function getDb() {
  if (db) return db;

  const { MONGO_URI, MONGO_DB } = await getConfig();

  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(MONGO_DB);

    console.log("✅ MongoDB Connected Successfully");
    return db;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    throw error;
  }
}
