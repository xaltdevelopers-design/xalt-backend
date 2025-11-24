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
  // piPrefix + serial number (always start with 0001)
  let piPrefixWithSerial = base.piPrefix || "";
  if (piPrefixWithSerial) {
    piPrefixWithSerial = `${piPrefixWithSerial}0001`;
  }
  let invoicePrefixWithSerial = base.invoicePrefix || "";
  if (invoicePrefixWithSerial) {
    invoicePrefixWithSerial = `${invoicePrefixWithSerial}0001`;
  }
  // piCounter starts at 1
  const initialPiCounter = 1;
  const withDates = { ...base, piPrefix: piPrefixWithSerial, invoicePrefix: invoicePrefixWithSerial, createdAt: now, updatedAt: now, piCounter: initialPiCounter } as any;
  try {
    const parsed = CompanySchema.parse(withDates);
    const col = await collection();
    // prevent multiple entries with same companyName
    const existing = await col.findOne({ companyName: parsed.companyName });
    if (existing) {
      throw { status: 400, message: `Company with name '${parsed.companyName}' already exists`, error: null };
    }
    const id = await col.insertOne(parsed as any);
    const created = await col.findOne({ _id: id } as any);
    // Add nextPiSerial to response (not persisted)
    let nextPiSerial: string | undefined = undefined;
    if (created && created.piPrefix) {
      const num = String((created.piCounter ?? 0) + 1).padStart(4, "0");
      nextPiSerial = `${created.piPrefix}${num}`;
      (created as any).nextPiSerial = nextPiSerial;
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
  // build a filter that works whether _id is an ObjectId, or an object like { $oid: '...' }, or a string
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
    // fallback to using rawId directly
    filter = { _id: rawId };
  }
  try {
    // increment counter
    await col.updateOne(filter as any, { $inc: { piCounter: 1 } });
    const updated = await col.findOne(filter as any);
    if (!updated) return null;
    // We intentionally do NOT persist the next serial on the company document.
    // Return the updated counter so callers can compute the serial when needed.
    return updated?.piCounter ?? null;
  } catch (err) {
    console.error("incrementPiCounter error:", err);
    return null;
  }
}

export async function getCompany() {
  const col = await collection();
  // return first company document
  const doc = await col.find({}).sort({ createdAt: -1 }).limit(1).toArray();
  const c = doc[0] || null;
  if (c && c.piPrefix) {
    const next = (c.piCounter ?? 0) + 1;
    const num = String(next).padStart(4, "0");
    (c as any).nextPiSerial = `${c.piPrefix}${num}`;
  }
  return c;
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


