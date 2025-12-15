export interface ProductSchema {
  _id?: { $oid: string };
  equipmentName: string;
  productSKU?: string;
  description?: string;
  price: number;
  inStockQty: number;
  currency?: string;
  // discountType?: "percent" | "absolute";
  // discountValue?: number;
  hsnSacCode?: string;
  productImages?: string[];
  shippingAddress?: string;
  billingAddress?: string;
  isRetrieve?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
