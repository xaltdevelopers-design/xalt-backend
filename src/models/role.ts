import { z } from "../deps.ts";

export const RoleSchema = z.object({
  name: z.string().min(2), // e.g. "manager", "customRole"
  permissions: z.array(z.string()), // e.g. ["manageUsers", "viewReports"]
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RoleSchemaType = z.infer<typeof RoleSchema>;
