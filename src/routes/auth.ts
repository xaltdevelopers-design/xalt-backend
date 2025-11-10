import { Router, z, Context } from "../deps.ts";
import { authenticate } from "../controllers/users.ts";
import { signToken } from "../middleware/auth.ts";

export const authRouter = new Router({ prefix: "/api/auth" });

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

authRouter.post("/login", async (ctx: Context) => {
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid credentials" };
    return;
  }
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Invalid email or password" };
    return;
  }
  const token = await signToken(user as any);
  ctx.response.body = { token, user };
});
