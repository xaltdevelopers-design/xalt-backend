import { MongoClient, Database } from "../deps.ts";
// Fallback: use official Node MongoDB driver (SRV resolution tends to be more robust)
// deno-lint-ignore no-explicit-any
import { MongoClient as NodeMongoClient } from "mongodb";
// @ts-ignore: Deno is available in runtime; declare for typechecking
// deno-lint-ignore no-explicit-any
declare const Deno: any;
import { getConfig } from "../utils/env.ts";

let db: Database | null = null;

export async function getDb(): Promise<Database | any> {
  if (db) return db;

  const { MONGO_URI, MONGO_DB } = await getConfig();
  const nonSrv = typeof Deno !== "undefined" && Deno.env ? Deno.env.get("MONGO_URI_NON_SRV") : undefined;
  const mask = (uri: string) => uri.replace(/:\/\/(.*?)(@)/, (_m, cred, at) => {
    if (!cred.includes(":")) return "://***:***" + at;
    const [user] = cred.split(":");
    return `://${user}:***` + at;
  });
  const ensureDbAndAuth = (uri: string, dbName: string) => {
    try {
      const [base, queryRaw] = uri.split("?");
      let baseFixed = base;
      if (!/\/[^/?]+$/.test(baseFixed.replace(/\/$/, ""))) {
        baseFixed = baseFixed.replace(/\/?$/, "/") + dbName;
      }
      const params = new URLSearchParams(queryRaw || "");
      if (!params.has("authSource")) params.set("authSource", "admin");
      const qs = params.toString();
      return qs ? `${baseFixed}?${qs}` : baseFixed;
    } catch (_e) {
      return uri;
    }
  };

  const effectiveUri = ensureDbAndAuth(MONGO_URI, MONGO_DB);

  try {
    const client = new MongoClient();
    await client.connect(effectiveUri);
    db = client.database(MONGO_DB);
    console.log("✅ MongoDB Connected");
    return db;
  } catch (error) {
    const msg = String(error);
    const isAuthFailure = /bad auth|authentication failed/i.test(msg);
    const isSrvDnsIssue = /_mongodb._tcp.*\.local\.|no records found|proto error/i.test(msg);
    if (isAuthFailure || isSrvDnsIssue) {
      try {
        const nodeClientSrv = new NodeMongoClient(effectiveUri);
        await nodeClientSrv.connect();
        // deno-lint-ignore no-explicit-any
        const nodeDbSrv: any = nodeClientSrv.db(MONGO_DB);
        db = nodeDbSrv;
        console.log("✅ MongoDB Connected");
        return db;
      } catch (nodeSrvErr) {
        // Continue to non-SRV fallback
      }
    }
    if (nonSrv) {
      try {
        const nodeClient = new NodeMongoClient(nonSrv);
        await nodeClient.connect();
        // deno-lint-ignore no-explicit-any
        const nodeDb: any = nodeClient.db(MONGO_DB);
        db = nodeDb;
        console.log("✅ MongoDB Connected");
        return db;
      } catch (fallbackErr) {
        console.error("❌ MongoDB Not Connected");
        throw fallbackErr;
      }
    }
    console.error("❌ MongoDB Not Connected");
    throw error;
  }
}
