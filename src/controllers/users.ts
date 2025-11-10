import { Collection, z, bcrypt } from "../deps.ts";
import { getDb } from "../db/mongo.ts";
import { UserSchema } from "../models/user.ts";

// Generate unique user ID based on userType
async function generateUserId(userType: "superAdmin" | "user"): Promise<string> {
  let prefix = "USR";
  if (userType === "superAdmin") prefix = "SUP";
  const col = await collection();
  // Count existing users of this type to get next number
  const count = await col.countDocuments({ userType });
  const nextNum = (count + 1).toString().padStart(3, "0");
  // Add random suffix for uniqueness
  const randomBytes = new Uint8Array(2);
  crypto.getRandomValues(randomBytes);
  const randomSuffix = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return `${prefix}${nextNum}${randomSuffix}`;
}

const userInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  roles: z.array(z.string()).optional(),
  userType: z.enum(["superAdmin", "user"]).optional(),
  // User-specific fields (optional, for regular users)
  mobileNo: z.string().min(10).optional(),
  companyName: z.string().optional(),
  gstNo: z.string().optional(),
  city: z.string().optional(),
  shippingAddress: z.string().optional(),
  billingAddress: z.string().optional(),
});

async function collection(): Promise<Collection<UserSchema>> {
  const db = await getDb();
  return db.collection<UserSchema>("users");
}

export async function createUser(data: unknown) {
  const parsed = userInput.parse(data);
  const col = await collection();
  const existing = await col.findOne({ email: parsed.email });
  if (existing) throw new Error("Email already exists");
  const passwordHash = await bcrypt.hash(parsed.password);
  
  const userType = parsed.userType ?? "user";
  const userId = await generateUserId(userType);
  const now = new Date();
  // Assign roles based on userType
  let roles: string[] = [userType];
  if (parsed.roles) roles = parsed.roles;
  const doc: UserSchema = {
    id: userId,
    email: parsed.email,
    name: parsed.name,
    passwordHash,
    roles,
    userType: userType,
    createdAt: now,
    updatedAt: now,
  };
  // Add user-specific fields if provided (for regular users)
  if (parsed.userType === "user" || !parsed.userType) {
    if (parsed.mobileNo) doc.mobileNo = parsed.mobileNo;
    if (parsed.companyName) doc.companyName = parsed.companyName;
    if (parsed.gstNo) doc.gstNo = parsed.gstNo;
    if (parsed.city) doc.city = parsed.city;
    if (parsed.shippingAddress) doc.shippingAddress = parsed.shippingAddress;
    if (parsed.billingAddress) doc.billingAddress = parsed.billingAddress;
  }
  const id = await col.insertOne(doc);
  const user = await col.findOne({ _id: id }, { projection: { passwordHash: 0 } });
  // Convert _id to proper format
  if (user) {
    const { _id, ...rest } = user as any;
    return {
      _id: { $oid: _id.toString() },
      ...rest
    };
  }
  return user;
}

export async function listUsers() {
  const col = await collection();
  const users = await col.find({}, { projection: { passwordHash: 0 } }).toArray();
  
  // Convert _id to proper format for all users
  return users.map((user: any) => {
    const { _id, ...rest } = user;
    return {
      _id: { $oid: _id.toString() },
      ...rest
    };
  });
}

export async function getUser(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  const user = await col.findOne({ _id: new ObjectId(id) } as any, { projection: { passwordHash: 0 } });
  
  // Convert _id to proper format
  if (user) {
    const { _id, ...rest } = user as any;
    return {
      _id: { $oid: _id.toString() },
      ...rest
    };
  }
  return user;
}

export async function updateUser(id: string, data: unknown) {
  const col = await collection();
  const partial = userInput.partial().parse(data);
  const update: Record<string, unknown> = {};
  
  if (partial.name) update.name = partial.name;
  if (partial.roles) update.roles = partial.roles;
  if (partial.userType) update.userType = partial.userType;
  if (partial.password) update.passwordHash = await bcrypt.hash(partial.password);
  
  // Update client-specific fields if provided
  if (partial.mobileNo !== undefined) update.mobileNo = partial.mobileNo;
  if (partial.companyName !== undefined) update.companyName = partial.companyName;
  if (partial.gstNo !== undefined) update.gstNo = partial.gstNo;
  if (partial.city !== undefined) update.city = partial.city;
  if (partial.shippingAddress !== undefined) update.shippingAddress = partial.shippingAddress;
  if (partial.billingAddress !== undefined) update.billingAddress = partial.billingAddress;
  
  update.updatedAt = new Date();
  
  const { ObjectId } = await import("../deps.ts");
  await col.updateOne({ _id: new ObjectId(id) } as any, { $set: update });
  return await getUser(id);
}

export async function deleteUser(id: string) {
  const col = await collection();
  const { ObjectId } = await import("../deps.ts");
  await col.deleteOne({ _id: new ObjectId(id) } as any);
  return { deleted: true };
}

export async function findByEmail(email: string) {
  const col = await collection();
  return await col.findOne({ email });
}

export async function findByIdRaw(id: string) {
  const col = await collection();
  // MongoDB uses ObjectId, not { $oid: string } for queries
  const { ObjectId } = await import("../deps.ts");
  return await col.findOne({ _id: new ObjectId(id) } as any);
}

export async function authenticate(email: string, password: string) {
  const col = await collection();
  const user = await col.findOne({ email });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  // sanitize and convert _id to proper format
  const { passwordHash, _id, ...rest } = user as any;
  return {
    _id: { $oid: _id.toString() },
    ...rest
  } as Omit<UserSchema, "passwordHash"> & { _id: { $oid: string } };
}
