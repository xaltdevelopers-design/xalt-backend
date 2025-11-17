import { Collection, z } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { BankSchema } from "../models/bank.ts";

// Generate unique bank ID
async function generateBankId(): Promise<string> {
  const prefix = "BNK";
  const col = await collection();
  const count = await col.countDocuments({});
  const nextNum = (count + 1).toString().padStart(3, "0");
  const randomBytes = new Uint8Array(2);
  crypto.getRandomValues(randomBytes);
  const randomSuffix = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return `${prefix}${nextNum}${randomSuffix}`;
}

const bankInput = z.object({
  accountHolderName: z.string().min(1, "Account holder name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  branchAddress: z.string().min(1, "Branch address is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"),
});

async function collection(): Promise<Collection<BankSchema>> {
  const db = await getDb();
  return db.collection<BankSchema>("banks");
}

export async function addBank(data: unknown) {
  const parsed = bankInput.parse(data);
  const col = await collection();
  
  // Check if account number already exists
  const existing = await col.findOne({ accountNumber: parsed.accountNumber });
  if (existing) throw new Error("Account number already exists");
  
  const bankId = await generateBankId();
  const now = new Date();
  
  const doc: BankSchema = {
    id: bankId,
    accountHolderName: parsed.accountHolderName,
    bankName: parsed.bankName,
    branchAddress: parsed.branchAddress,
    accountNumber: parsed.accountNumber,
    ifscCode: parsed.ifscCode.toUpperCase(),
    createdAt: now,
    updatedAt: now,
  };
  
  const insertId = await col.insertOne(doc);
  const bank = await col.findOne({ _id: insertId });
  
  if (bank) {
    const { _id, ...rest } = bank as any;
    return {
      _id: { $oid: _id.toString() },
      ...rest
    };
  }
  return bank;
}

export async function listBanks() {
  const col = await collection();
  const banks = await col.find({}).sort({ createdAt: -1 }).toArray();
  
  return banks.map((bank: any) => {
    const { _id, ...rest } = bank;
    return {
      _id: { $oid: _id.toString() },
      ...rest
    };
  });
}

export async function getBank(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  const bank = await col.findOne({ _id: new ObjectId(id) } as any);
  
  if (bank) {
    const { _id, ...rest } = bank as any;
    return {
      _id: { $oid: _id.toString() },
      ...rest
    };
  }
  return bank;
}

export async function updateBank(id: string, data: unknown) {
  const col = await collection();
  const partial = bankInput.partial().parse(data);
  const update: Record<string, unknown> = {};
  
  if (partial.accountHolderName) update.accountHolderName = partial.accountHolderName;
  if (partial.bankName) update.bankName = partial.bankName;
  if (partial.branchAddress) update.branchAddress = partial.branchAddress;
  if (partial.accountNumber) update.accountNumber = partial.accountNumber;
  if (partial.ifscCode) update.ifscCode = partial.ifscCode.toUpperCase();
  
  update.updatedAt = new Date();
  
  const { ObjectId } = await import("../deps.ts");
  await col.updateOne({ _id: new ObjectId(id) } as any, { $set: update });
  return await getBank(id);
}

export async function deleteBank(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  await col.deleteOne({ _id: new ObjectId(id) } as any);
  return { success: true, message: "Bank deleted successfully" };
}
