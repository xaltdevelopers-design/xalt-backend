export interface UserSchema {
  _id?: { $oid: string };
  id: string; // Custom readable ID (e.g., "USR001", "SUP001")
  email: string;
  name: string;
  passwordHash: string; // bcrypt hash
  roles: string[]; // e.g., ['superAdmin'], ['user']
  userType: "superAdmin" | "user"; // User type classification
  // User-specific fields (optional, for regular users/clients)
  mobileNo?: string;
  companyName?: string;
  gstNo?: string;
  city?: string;
  shippingAddress?: string;
  billingAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}
