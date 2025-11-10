
// @ts-ignore: Deno namespace is available in Deno runtime
// deno-lint-ignore no-explicit-any
declare const Deno: any;
import { Application, green, yellow, red, Context } from "./deps.ts";
import { send } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { api } from "./routes/index.ts";
import { authMiddleware } from "./middleware/auth.ts";

export function createApp() {
  const app = new Application();
  // Enable CORS for all routes
  app.use(oakCors());

  // Basic logger
  app.use(async (ctx: Context, next: () => Promise<unknown>) => {
    const start = Date.now();
    try {
      await next();
      const ms = Date.now() - start;
      console.log(yellow(`${ctx.request.method} ${ctx.request.url.pathname} - ${ms}ms`));
    } catch (err) {
      console.error(red("Unhandled error:"), err);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: typeof err === "object" && err !== null && "message" in err ? (err as any).message : "Internal Server Error",
        error: "Internal Server Error"
      };
    }
  });

  // Serve static files from /uploads directory
  app.use(async (ctx: Context, next: () => Promise<unknown>) => {
    if (ctx.request.url.pathname.startsWith("/uploads/")) {
      try {
        await send(ctx, ctx.request.url.pathname, {
          root: Deno.cwd(),
        });
      } catch {
        await next();
      }
    } else {
      await next();
    }
  });

  // Default root route
  app.use((ctx: Context, next: () => Promise<unknown>) => {
    if (ctx.request.url.pathname === "/") {
      ctx.response.status = 200;
      ctx.response.body = { message: "Welcome to Xolt Deno API!" };
      return;
    }
    return next();
  });

  app.use(api.routes());
  app.use(api.allowedMethods());
  // Attach auth middleware globally so ctx.state.currentUser is set when token is present
  app.use(authMiddleware);

  return app;
}

export async function startServer(port: number) {
  const app = createApp();
  console.log(green(`Server starting on http://localhost:${port}`));
  await app.listen({ hostname: "0.0.0.0",port });
}
