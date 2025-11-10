import { Collection, z } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { ProductSchema } from "../models/product.ts";

const productInput = z.object({
  equipmentName: z.string().min(1),
  productSKU: z.string().regex(/^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]+$/, {
    message: "Product SKU must contain both letters and numbers"
  }).optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  inStockQty: z.number().int().min(0),
  discountType: z.enum(["percent", "absolute"]).optional(),
  discountValue: z.number().min(0).optional(),
  hsnSacCode: z.string().optional(),
  productImages: z.array(z.string()).optional(),
  shippingAddress: z.string().optional(),
  billingAddress: z.string().optional(),
});

async function collection(): Promise<Collection<ProductSchema>> {
  const db = await getDb();
  return db.collection<ProductSchema>("products");
}

export async function addProduct(data: unknown) {
  const parsed = productInput.parse(data);
  const col = await collection();
  const now = new Date();
  const doc: ProductSchema = {
    ...parsed,
    createdAt: now,
    updatedAt: now,
  };
  const id = await col.insertOne(doc);
  const product = await col.findOne({ _id: id });
  if (product) {
    const { _id, ...rest } = product as any;
    return { _id: { $oid: _id.toString() }, ...rest };
  }
  return product;
}

export async function listProducts() {
  const col = await collection();
  const products = await col.find({}).sort({ createdAt: -1 }).toArray();
  return products.map((product: any) => {
    const { _id, ...rest } = product;
    return { _id: { $oid: _id.toString() }, ...rest };
  });
}

export async function getProduct(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  const product = await col.findOne({ _id: new ObjectId(id) } as any);
  if (product) {
    const { _id, ...rest } = product as any;
    return { _id: { $oid: _id.toString() }, ...rest };
  }
  return product;
}

export async function updateProduct(id: string, data: unknown) {
  const col = await collection();
  const partial = productInput.partial().parse(data);
  const update: Record<string, unknown> = { ...partial, updatedAt: new Date() };
  const { ObjectId } = await import("../deps.ts");
  await col.updateOne({ _id: new ObjectId(id) } as any, { $set: update });
  return await getProduct(id);
}

export async function deleteProduct(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  await col.deleteOne({ _id: new ObjectId(id) } as any);
  return { deleted: true };
}
