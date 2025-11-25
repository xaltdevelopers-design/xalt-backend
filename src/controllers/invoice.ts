import { Collection, z } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { InvoiceSchema, InvoiceType } from "../models/invoice.ts";
import { getCompany } from "../controllers/company.ts";

async function collection(): Promise<Collection<InvoiceType>> {
  const db = await getDb();
  return db.collection<InvoiceType>("invoice");
}

export async function createInvoice(data: unknown) {
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
  // Generate invoice serial from company invoicePrefix
  let company = null;
  const { ObjectId } = await import("../deps.ts");
  if (base.companyId) {
    const colCompany = await (await getDb()).collection("company");
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
  
  if (company && company.invoicePrefix) {
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
    await colCompany.updateOne(filter as any, { $inc: { invoiceCounter: 1 } });
    const updated = await colCompany.findOne(filter as any);
    const next = updated?.invoiceCounter ?? 1;
    const num = String(next).padStart(4, "0");
    const finalPrefix = company.invoicePrefix.endsWith("/") ? company.invoicePrefix : `${company.invoicePrefix}/`;
    base.invoiceSerial = `${finalPrefix}${num}`;
  }
  const withDates = { ...base, createdAt: now, updatedAt: now } as unknown;
  const parsed = InvoiceSchema.parse(withDates);
  const col = await collection();
  const id = await col.insertOne(parsed as any);
  return await col.findOne({ _id: id } as any);
}

export async function listInvoice() {
  const col = await collection();
  const invoices = await col.find({}).sort({ createdAt: -1 }).toArray();
  
  // Populate clientId and companyId
  const db = await getDb();
  const { ObjectId } = await import("../deps.ts");
  const userCol = db.collection("users");
  const companyCol = db.collection("company");
  
  const populated = await Promise.all(invoices.map(async (invoice: any) => {
    let client = null;
    let company = null;
    
    // Populate clientId (user) - clientId is a string, match with user.id field
    if (invoice.clientId) {
      try {
        client = await userCol.findOne({ id: String(invoice.clientId) });
      } catch (e) {
        console.error("Failed to populate client:", e);
      }
    }
    
    // Populate companyId
    if (invoice.companyId) {
      try {
        const companyFilter = { _id: new ObjectId(invoice.companyId) };
        company = await companyCol.findOne(companyFilter);
      } catch {}
    }
    
    return {
      ...invoice,
      clientDetails: client,
      companyDetails: company
    };
  }));
  
  return populated;
}

export async function getInvoice(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  const invoice = await col.findOne({ _id: new ObjectId(id) } as any);
  if (!invoice) return null;
  
  // Populate clientId and companyId
  const db = await getDb();
  const userCol = db.collection("users");
  const companyCol = db.collection("company");
  
  let client = null;
  let company = null;
  
  // Populate clientId (user) - clientId is a string, match with user.id field
  if (invoice.clientId) {
    try {
      client = await userCol.findOne({ id: String(invoice.clientId) });
    } catch (e) {
      console.error("Failed to populate client:", e);
    }
  }
  
  // Populate companyId
  if (invoice.companyId) {
    try {
      const companyFilter = { _id: new ObjectId(invoice.companyId) };
      company = await companyCol.findOne(companyFilter);
    } catch {}
  }
  
  return {
    ...invoice,
    clientDetails: client,
    companyDetails: company
  };
}

export async function updateInvoice(id: string, data: unknown) {
  const col = await collection();
  const partial = InvoiceSchema.partial().parse(data);
  const { ObjectId } = await import("../deps.ts");
  await col.updateOne({ _id: new ObjectId(id) } as any, { $set: { ...partial, updatedAt: new Date() } });
  return await col.findOne({ _id: new ObjectId(id) } as any);
}

export async function deleteInvoice(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  await col.deleteOne({ _id: new ObjectId(id) } as any);
  return { deleted: true };
}
