import { Collection, z } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { PISchema, PIType } from "../models/pi.ts";

async function collection(): Promise<Collection<PIType>> {
  const db = await getDb();
  return db.collection<PIType>("pi");
}

export async function createPI(data: unknown) {
  const now = new Date();
  const withDates = {
    ...(typeof data === "object" && data !== null ? data : {}),
    createdAt: now,
    updatedAt: now,
  } as unknown;
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
