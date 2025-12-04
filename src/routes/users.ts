import { Router, Context } from "../deps.ts";
import { authMiddleware, requireAuth, requireRole } from "../middleware/auth.ts";
import { createUser, listUsers, getUser, updateUser, deleteUser, listClients, toggleUserRetrieve, getUsersByRetrieve } from "../controllers/users.ts";

export const usersRouter = new Router({ prefix: "/api/users" });

// Attach auth middleware for every user route
usersRouter.use(authMiddleware);

// List users (admin only)
usersRouter.get("/", async (ctx: Context) => {
  requireRole("superAdmin", ctx);
  let users = await listUsers();
  // Filter out super admins
  users = users.filter((u: any) => u.userType !== "superAdmin");
  ctx.response.body = {
    success: true,
    message: "Users fetched successfully",
    data: users
  };
});

// List clients (all authenticated users can see client list)
usersRouter.get("/clients", async (ctx: Context) => {
  requireAuth(ctx);
  const clients = await listClients();
  ctx.response.body = { success: true, message: "Clients fetched successfully", data: clients };
});

// Get users by retrieve status (admin only) - Must come before /:id route
usersRouter.get("/retrieve/:isRetrieve", async (ctx: Context) => {
  requireRole("superAdmin", ctx);
  const isRetrieve = ctx.params.isRetrieve === "true";
  try {
    const users = await getUsersByRetrieve(isRetrieve);
    ctx.response.body = {
      success: true,
      message: "Users fetched successfully",
      data: users
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bad Request";
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: msg,
      error: msg
    };
  }
});

// Toggle user retrieve status (admin only) - Must come before /:id route
usersRouter.patch("/toggle-retrieve/:id", async (ctx: Context) => {
  requireRole("superAdmin", ctx);
  const id = ctx.params.id!;
  try {
    const updated = await toggleUserRetrieve(id);
    ctx.response.body = {
      success: true,
      message: "User retrieve status toggled successfully",
      data: updated
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bad Request";
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: msg,
      error: msg
    };
  }
});

// Create user (admin only)
usersRouter.post("/", async (ctx: Context) => {
  requireRole("superAdmin", ctx);
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  try {
    const user = await createUser(body);
    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      message: "User created successfully",
      data: user
    };
  } catch (e: unknown) {
    // Handle Zod validation errors
    if (e instanceof Error && (e as any).errors && Array.isArray((e as any).errors)) {
      const details = (e as any).errors.map((err: any) => ({
        field: err.path?.[0] ?? null,
        message: err.message
      }));
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Validation failed",
        error: {
          message: "Validation failed",
          details
        }
      };
      return;
    }
    const msg = e instanceof Error ? e.message : "Bad Request";
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: msg,
      error: msg
    };
  }
});

// Get own or admin can get any
usersRouter.get("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  const requesterId = ctx.state.currentUser!._id.$oid;
  if (requesterId !== id && !ctx.state.currentUser!.roles.includes("admin")) {
    ctx.response.status = 403;
    ctx.response.body = { error: "Forbidden" };
    return;
  }
  const user = await getUser(id);
  if (!user) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Not found" };
    return;
  }
  ctx.response.body = user;
});

// Update own or admin
usersRouter.put("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  const requesterId = ctx.state.currentUser!._id.$oid;
  if (requesterId !== id && !ctx.state.currentUser!.roles.includes("admin")) {
    ctx.response.status = 403;
    ctx.response.body = { error: "Forbidden" };
    return;
  }
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  try {
    const updated = await updateUser(id, body);
    if (!updated) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Not found" };
      return;
    }
    ctx.response.body = updated;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bad Request";
    ctx.response.status = 400;
    ctx.response.body = { error: msg };
  }
});

// Delete (admin only)
usersRouter.delete("/:id", async (ctx: Context) => {
  requireRole("admin", ctx);
  const id = ctx.params.id!;
  await deleteUser(id);
  ctx.response.status = 204;
});
