import { Router, Context } from "../deps.ts";

export const healthRouter = new Router();

healthRouter.get("/health", (ctx: Context) => {
  ctx.response.status = 200;
  ctx.response.body = { ok: true, status: "healthy" };
});
