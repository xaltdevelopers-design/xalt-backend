import { Router, z, Context } from "../deps.ts";
import { createUser, listUsers } from "../controllers/users.ts";

export const bootstrapRouter = new Router({ prefix: "/api/bootstrap" });

const superAdminInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6)
});

// Only allows if no users exist
bootstrapRouter.post("/admin", async (ctx: Context) => {
  const users = await listUsers();
  if (users.length > 0) {
    ctx.response.status = 403;
    ctx.response.body = { error: "SuperAdmin already exists" };
    return;
  }
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  const parsed = superAdminInput.safeParse(body);
  if (!parsed.success) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid input" };
    return;
  }
  try {
    const user = await createUser({ ...parsed.data, roles: ["superAdmin"], userType: "superAdmin" });
    ctx.response.status = 201;
    ctx.response.body = user;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bad Request";
    ctx.response.status = 400;
    ctx.response.body = { error: msg };
  }
});
