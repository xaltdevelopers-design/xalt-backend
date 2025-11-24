import { Collection, z } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { CompanySchema, CompanyType } from "../models/company.ts";

async function collection(): Promise<Collection<CompanyType>> {
  const db = await getDb();
  return db.collection<CompanyType>("company");
}

export async function createCompany(data: unknown) {
  const now = new Date();
  const base = (typeof data === "object" && data !== null ? (data as any) : {});
  const col = await collection();
  // Initialize counters at 0, increment happens when PI/Invoice is generated
  const initialPiCounter = 0;
  const initialInvoiceCounter = 0;
  const withDates = {
    ...base,
    piCounter: initialPiCounter,
    invoiceCounter: initialInvoiceCounter,
    createdAt: now,
    updatedAt: now
  } as any;
  try {
    const parsed = CompanySchema.parse(withDates);
    // prevent multiple entries with same companyName
    const existing = await col.findOne({ companyName: parsed.companyName });
    if (existing) {
      throw { status: 400, message: `Company with name '${parsed.companyName}' already exists`, error: null };
    }
    const id = await col.insertOne(parsed as any);
    let created = await col.findOne({ _id: id } as any);
    // Fallback if created is null
    if (!created) {
      created = { ...parsed };
    }
    return created;
  } catch (e) {
    if (e && typeof e === "object" && "errors" in e && Array.isArray((e as any).errors)) {
      throw { status: 400, message: "Validation error", error: (e as any).errors.map((err: any) => ({ path: Array.isArray(err.path) ? err.path.join('.') : err.path, message: err.message })) };
    }
    throw e;
  }
}

export async function incrementPiCounter() {
  const col = await collection();
  // find latest company
  const company = await getCompany();
  if (!company) return null;
  const { ObjectId } = await import("../deps.ts");
  const rawId = (company as any)._id;
  let filter: any;
  try {
    if (rawId && typeof rawId === "object" && "$oid" in rawId) {
      filter = { _id: new ObjectId(String(rawId.$oid)) };
    } else if (typeof rawId === "string") {
      filter = { _id: new ObjectId(rawId) };
    } else {
      filter = { _id: rawId };
    }
  } catch (_) {
    filter = { _id: rawId };
  }
  try {
    await col.updateOne(filter as any, { $inc: { piCounter: 1 } });
    const updated = await col.findOne(filter as any);
    if (!updated) return null;
    return updated?.piCounter ?? null;
  } catch (err) {
    console.error("incrementPiCounter error:", err);
    return null;
  }

}

export async function incrementInvoiceCounter() {
  const col = await collection();
  const company = await getCompany();
  if (!company) return null;
  const { ObjectId } = await import("../deps.ts");
  const rawId = (company as any)._id;
  let filter: any;
  try {
    if (rawId && typeof rawId === "object" && "$oid" in rawId) {
      filter = { _id: new ObjectId(String(rawId.$oid)) };
    } else if (typeof rawId === "string") {
      filter = { _id: new ObjectId(rawId) };
    } else {
      filter = { _id: rawId };
    }
  } catch (_) {
    filter = { _id: rawId };
  }
  try {
    await col.updateOne(filter as any, { $inc: { invoiceCounter: 1 } });
    const updated = await col.findOne(filter as any);
    if (!updated) return null;
    return updated?.invoiceCounter ?? null;
  } catch (err) {
    console.error("incrementInvoiceCounter error:", err);
    return null;
  }
}

export async function getCompany() {
  const col = await collection();
  // return all company documents as array
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  for (const c of docs) {
    if (c && c.piPrefix) {
      const next = (c.piCounter ?? 0) + 1;
      const num = String(next).padStart(4, "0");
      (c as any).nextPiSerial = `${c.piPrefix}${num}`;
    }
  }
  return docs;
}

export async function updateCompany(id: string, data: unknown) {
  const col = await collection();
  const partial = CompanySchema.partial().parse(data);
  const { ObjectId } = await import("../deps.ts");
  await col.updateOne({ _id: new ObjectId(id) } as any, { $set: { ...partial, updatedAt: new Date() } });
  return await col.findOne({ _id: new ObjectId(id) } as any);
}

export async function deleteCompany(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");

  const result = await col.deleteOne({ _id: new ObjectId(id) } as any);

  return {
    deleted: result.deletedCount > 0,
    deletedCount: result.deletedCount,
  };
}


