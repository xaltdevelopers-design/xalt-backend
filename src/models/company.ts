import { z } from "../deps.ts";

export const CompanySchema = z.object({
  companyName: z.string().min(1),
  taxId: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional(),
  mobileNo: z.string().optional(),
  piPrefix: z.string().optional(),
  invoicePrefix: z.string().optional(),
  piCounter: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CompanyType = z.infer<typeof CompanySchema>;
