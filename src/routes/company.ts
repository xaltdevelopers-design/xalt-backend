import { Router, Context } from "../deps.ts";
import { createCompany, getCompany, updateCompany, deleteCompany } from "../controllers/company.ts";
import { requireAuth, requireRole } from "../middleware/auth.ts";

export const companyRouter = new Router({ prefix: "/api/company" });

// Create company (superAdmin only)
companyRouter.post("/", async (ctx: Context) => {
  requireRole("superAdmin", ctx);
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  try {
    const created = await createCompany(body);
    ctx.response.status = 201;
    ctx.response.body = { success: true, data: created };
  } catch (e: any) {
    ctx.response.status = e?.status || 400;
    ctx.response.body = { success: false, message: e?.message || "Bad Request", error: e?.error || null };
  }
});

// Get company (authenticated)
companyRouter.get("/", async (ctx: Context) => {
  requireAuth(ctx);
  const doc = await getCompany();
  if (!doc) {
    ctx.response.status = 404;
    ctx.response.body = { success: false, message: "Not found", data: null };
    return;
  }
  // If doc is array, return as array, else as object
  if (Array.isArray(doc)) {
    ctx.response.body = { success: true, data: doc };
  } else {
    ctx.response.body = { success: true, data: [doc] };
  }
});

// Update company (superAdmin only)
companyRouter.put("/:id", async (ctx: Context) => {
  requireRole("superAdmin", ctx);
  const id = ctx.params.id!;
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  try {
    const updated = await updateCompany(id, body);
    ctx.response.body = { success: true, data: updated };
  } catch (e: any) {
    ctx.response.status = e?.status || 400;
    ctx.response.body = { success: false, message: e?.message || "Bad Request", error: e?.error || null };
  }
});

// Delete company (superAdmin only)
companyRouter.delete("/:id", async (ctx:Context) => {
  const { id } = ctx.params;
  const result = await deleteCompany(id);

  ctx.response.status = 200; 
  ctx.response.body = {
    success: result.deleted,
    deletedCount: result.deletedCount,
  };
});