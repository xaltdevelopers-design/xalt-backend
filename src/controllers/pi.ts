import { Collection, z } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { PISchema, PIType } from "../models/pi.ts";
import { getCompany, incrementPiCounter } from "../controllers/company.ts";
import { createInvoice } from "../controllers/invoice.ts";

async function collection(): Promise<Collection<PIType>> {
  const db = await getDb();
  return db.collection<PIType>("pi");
}

export async function createPI(data: unknown) {
  const now = new Date();
  const base = (typeof data === "object" && data !== null ? { ...(data as any) } : {}) as any;
  
  // Check if this should be an Invoice instead of PI
  const isPI = base.pi !== false; // default to true if not specified
  if (!isPI) {
    // Redirect to Invoice creation
    return await createInvoice(data);
  }
  
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
  // Generate PI serial from piPrefix
  const prefix = company?.piPrefix;
  const counterField = "piCounter";
  
  if (company && prefix) {
    // Increment appropriate counter for this company
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
    await colCompany.updateOne(filter as any, { $inc: { [counterField]: 1 } });
    const updated = await colCompany.findOne(filter as any);
    const next = updated?.[counterField] ?? 1;
    const num = String(next).padStart(4, "0");
    // Ensure prefix ends with "/" before adding serial number
    const finalPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
    base.piSerial = `${finalPrefix}${num}`;
  }
  const withDates = { ...base, isRetrieve: false, createdAt: now, updatedAt: now } as unknown;
  const parsed = PISchema.parse(withDates);
  const col = await collection();
  const id = await col.insertOne(parsed as any);
  return await col.findOne({ _id: id } as any);
}

export async function listPI() {
  const col = await collection();
  const pis = await col.find({}).sort({ createdAt: -1 }).toArray();
  
  // Populate clientId and companyId
  const db = await getDb();
  const { ObjectId } = await import("../deps.ts");
  const userCol = db.collection("users");
  const companyCol = db.collection("company");
  
  const populated = await Promise.all(pis.map(async (pi: any) => {
    let client = null;
    let company = null;
    
    // Populate clientId (user) - clientId is a string, match with user.id field
    if (pi.clientId) {
      try {
        client = await userCol.findOne({ id: String(pi.clientId) });
      } catch (e) {
        console.error("Failed to populate client:", e);
      }
    }
    
    // Populate companyId
    if (pi.companyId) {
      try {
        const companyFilter = { _id: new ObjectId(pi.companyId) };
        company = await companyCol.findOne(companyFilter);
      } catch {}
    }
    
    return {
      ...pi,
      clientDetails: client,
      companyDetails: company
    };
  }));
  
  return populated;
}

export async function getPI(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  const pi = await col.findOne({ _id: new ObjectId(id) } as any);
  if (!pi) return null;
  
  // Populate clientId and companyId
  const db = await getDb();
  const userCol = db.collection("users");
  const companyCol = db.collection("company");
  
  let client = null;
  let company = null;
  
  // Populate clientId (user) - clientId is a string, match with user.id field
  if (pi.clientId) {
    try {
      client = await userCol.findOne({ id: String(pi.clientId) });
    } catch (e) {
      console.error("Failed to populate client:", e);
    }
  }
  
  // Populate companyId
  if (pi.companyId) {
    try {
      const companyFilter = { _id: new ObjectId(pi.companyId) };
      company = await companyCol.findOne(companyFilter);
    } catch {}
  }
  
  return {
    ...pi,
    clientDetails: client,
    companyDetails: company
  };
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

export async function togglePIRetrieve(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  
  // Get current PI
  const pi = await col.findOne({ _id: new ObjectId(id) } as any);
  if (!pi) {
    throw new Error("PI not found");
  }
  
  // Toggle isRetrieve
  const newIsRetrieve = !pi.isRetrieve;
  await col.updateOne(
    { _id: new ObjectId(id) } as any,
    { $set: { isRetrieve: newIsRetrieve, updatedAt: new Date() } }
  );
  
  return await col.findOne({ _id: new ObjectId(id) } as any);
}

export async function getPIsByRetrieve(isRetrieve: boolean) {
  const col = await collection();
  const pis = await col.find({ isRetrieve }).sort({ createdAt: -1 }).toArray();
  
  // Populate clientId and companyId
  const db = await getDb();
  const { ObjectId } = await import("../deps.ts");
  const userCol = db.collection("users");
  const companyCol = db.collection("company");
  
  const populated = await Promise.all(pis.map(async (pi: any) => {
    let client = null;
    let company = null;
    
    // Populate clientId (user)
    if (pi.clientId) {
      try {
        client = await userCol.findOne({ id: String(pi.clientId) });
      } catch (e) {
        console.error("Failed to populate client:", e);
      }
    }
    
    // Populate companyId
    if (pi.companyId) {
      try {
        const companyFilter = { _id: new ObjectId(pi.companyId) };
        company = await companyCol.findOne(companyFilter);
      } catch {}
    }
    
    return {
      ...pi,
      clientDetails: client,
      companyDetails: company
    };
  }));
  
  return populated;
}
