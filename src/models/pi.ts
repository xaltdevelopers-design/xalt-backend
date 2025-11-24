import { z } from "../deps.ts";

export const PIItemSchema = z.object({
  id: z.number().optional(),
  equipmentName: z.string().min(1),
  description: z.string().optional(),
  qty: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  image: z.string().optional()
});

export const PISchema = z.object({
  clientId: z.union([z.string(), z.number()]).optional(),
  companyId: z.string().optional(),
  customerId: z.string().optional(),
  preparedBy: z.string().optional(),
  items: z.array(PIItemSchema).min(1),
  subtotal: z.number().min(0),
  discount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  taxPercent: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  grandTotal: z.number().min(0),
  piSerial: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PIType = z.infer<typeof PISchema>;
export type PIItemType = z.infer<typeof PIItemSchema>;
