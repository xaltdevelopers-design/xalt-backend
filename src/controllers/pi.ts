import { Collection, z } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { PISchema, PIType } from "../models/pi.ts";
import { getCompany, incrementPiCounter } from "../controllers/company.ts";

async function collection(): Promise<Collection<PIType>> {
  const db = await getDb();
  return db.collection<PIType>("pi");
}

export async function createPI(data: unknown) {
  const now = new Date();
  const base = (typeof data === "object" && data !== null ? { ...(data as any) } : {}) as any;
  // try to allocate a serial from company piPrefix
  const company = await getCompany();
  if (company && company.piPrefix) {
    const next = await incrementPiCounter();
    if (typeof next === "number") {
      const num = String(next).padStart(4, "0");
      base.piSerial = `${company.piPrefix}${num}`;
    }
  }
  const withDates = { ...base, createdAt: now, updatedAt: now } as unknown;
  const parsed = PISchema.parse(withDates);
  const col = await collection();
  const id = await col.insertOne(parsed as any);
  return await col.findOne({ _id: id } as any);
}

export async function listPI() {
  const col = await collection();
  return await col.find({}).sort({ createdAt: -1 }).toArray();
}

export async function getPI(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  const pi = await col.findOne({ _id: new ObjectId(id) } as any);
  return pi || null;
}

export async function updatePI(id: string, data: unknown) {
  const col = await collection();
  const partial = PISchema.partial().parse(data);
  const { ObjectId } = await import("../deps.ts");
  await col.updateOne({ _id: new ObjectId(id) } as any, { $set: { ...partial, updatedAt: new Date() } });
  return await col.findOne({ _id: new ObjectId(id) } as any);
}

export async function deletePI(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  await col.deleteOne({ _id: new ObjectId(id) } as any);
  return { deleted: true };
}
