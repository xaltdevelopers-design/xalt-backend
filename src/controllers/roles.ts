import { Collection, z } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { RoleSchema, RoleSchemaType } from "../models/role.ts";

async function collection(): Promise<Collection<RoleSchemaType>> {
  const db = await getDb();
  return db.collection<RoleSchemaType>("roles");
}

export async function createRole(data: unknown) {
  const now = new Date();
  // Add createdAt/updatedAt before validation
  const withDates = {
    ...(typeof data === "object" && data !== null ? data : {}),
    createdAt: now,
    updatedAt: now,
  };
  try {
    const parsed = RoleSchema.parse(withDates);
    const col = await collection();
    // Check for duplicate role name
    const existing = await col.findOne({ name: parsed.name });
    if (existing) {
      throw {
        status: 400,
        message: `Role with name '${parsed.name}' already exists`,
        error: null
      };
    }
    const id = await col.insertOne(parsed);
    return await col.findOne({ _id: id });
  } catch (e) {
    // Zod error formatting
    if (e && typeof e === "object" && "errors" in e && Array.isArray((e as any).errors)) {
      throw {
        status: 400,
        message: "Validation error",
        error: (e as any).errors.map((err: any) => ({
          path: Array.isArray(err.path) ? err.path.join(".") : err.path,
          message: err.message
        }))
      };
    }
    throw e;
  }
}

export async function getRoles() {
  const col = await collection();
  return await col.find({}).sort({ createdAt: -1 }).toArray();
}

export async function updateRole(id: string, data: unknown) {
  const col = await collection();
  const partial = RoleSchema.partial().parse(data);
  const { ObjectId } = await import("../deps.ts");
  await col.updateOne({ _id: new ObjectId(id) } as any, { $set: { ...partial, updatedAt: new Date() } });
  return await col.findOne({ _id: new ObjectId(id) } as any);
}

export async function deleteRole(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  await col.deleteOne({ _id: new ObjectId(id) } as any);
  return { deleted: true };
}
