import { Router, Context } from "../deps.ts";
import { createRole, getRoles, updateRole, deleteRole } from "../controllers/roles.ts";
import { requireRole } from "../middleware/auth.ts";

export const rolesRouter = new Router({ prefix: "/api/roles" });

// Only superAdmin can manage roles
rolesRouter.use((ctx: any, next: any) => {
  requireRole("superAdmin", ctx);
  return next();
});

rolesRouter.post("/", async (ctx: Context) => {
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  try {
    const role = await createRole(body);
    ctx.response.status = 201;
    ctx.response.body = { success: true, data: role };
  } catch (e: any) {
    if (e && typeof e === "object" && e.status === 400) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: e.message,
        error: e.error,
        data: null
      };
      return;
    }
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: e instanceof Error ? e.message : "Bad Request",
      error: e instanceof Error ? e.message : e,
      data: null
    };
  }
});

rolesRouter.get("/", async (ctx: Context) => {
  const roles = await getRoles();
  ctx.response.body = { success: true, data: roles };
});

rolesRouter.put("/:id", async (ctx: Context) => {
  const id = ctx.params.id!;
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  const updated = await updateRole(id, body);
  ctx.response.body = { success: true, data: updated };
});

rolesRouter.delete("/:id", async (ctx: Context) => {
  const id = ctx.params.id!;
  await deleteRole(id);
  ctx.response.status = 204;
});
