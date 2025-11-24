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
  // Ensure every item has image field
  if (Array.isArray(base.items)) {
    for (let i = 0; i < base.items.length; i++) {
      if (typeof base.items[i].image === "undefined") {
        base.items[i].image = "";
      }
    }
  }
  // try to allocate a serial from company piPrefix
  let company = null;
  const { ObjectId } = await import("../deps.ts");
  if (base.companyId) {
    const colCompany = await (await getDb()).collection("company");
    // Convert companyId string to ObjectId for MongoDB query
    let companyFilter: any;
    try {
      companyFilter = { _id: new ObjectId(base.companyId) };
    } catch {
      companyFilter = { _id: base.companyId };
    }
    company = await colCompany.findOne(companyFilter);
  } else {
    company = await getCompany();
    if (Array.isArray(company)) company = company[0];
  }
  if (company && company.piPrefix) {
    // Increment only for this company
    const colCompany = await (await getDb()).collection("company");
    let filter: any;
    try {
      if (typeof company._id === "object" && "$oid" in company._id) {
        filter = { _id: new ObjectId(String(company._id.$oid)) };
      } else if (typeof company._id === "string") {
        filter = { _id: new ObjectId(company._id) };
      } else {
        filter = { _id: company._id };
      }
    } catch (_) {
      filter = { _id: company._id };
    }
    await colCompany.updateOne(filter as any, { $inc: { piCounter: 1 } });
    const updated = await colCompany.findOne(filter as any);
    const next = updated?.piCounter ?? 1;
    const num = String(next).padStart(4, "0");
    // Ensure piPrefix ends with "/" before adding serial number
    const prefix = company.piPrefix.endsWith("/") ? company.piPrefix : `${company.piPrefix}/`;
    base.piSerial = `${prefix}${num}`;
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
