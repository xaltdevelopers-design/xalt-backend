import { Router, Context } from "../deps.ts";
import { addBank, listBanks, getBank, updateBank, deleteBank } from "../controllers/banks.ts";
import { requireAuth, requireRole } from "../middleware/auth.ts";

export const banksRouter = new Router({ prefix: "/api/banks" });

// Test route to verify router is loaded
banksRouter.get("/test", (ctx: Context) => {
  ctx.response.status = 200;
  ctx.response.body = { ok: true, message: "Banks router is active" };
});

// List all banks (superAdmin only)
banksRouter.get("/", async (ctx: Context) => {
  requireAuth(ctx);
  requireRole("superAdmin", ctx);
  try {
    const banks = await listBanks();
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Banks retrieved successfully",
      data: banks
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Failed to retrieve banks",
      error: error instanceof Error ? error.message : "Internal server error"
    };
  }
});

// Add new bank (superAdmin only)
banksRouter.post("/add", async (ctx: Context) => {
  requireAuth(ctx);
  requireRole("superAdmin", ctx);
  try {
    const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
    const bank = await addBank(body);
    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      message: "Bank added successfully",
      data: bank
    };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: "Failed to add bank",
      error: error instanceof Error ? error.message : "Bad request"
    };
  }
});

// Get single bank by ID (superAdmin only)
banksRouter.get("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  requireRole("superAdmin", ctx);
  try {
    const { id } = ctx.params;
    const bank = await getBank(id);
    if (!bank) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Bank not found",
        error: "Bank not found"
      };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Bank retrieved successfully",
      data: bank
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Failed to retrieve bank",
      error: error instanceof Error ? error.message : "Internal server error"
    };
  }
});

// Update bank (superAdmin only)
banksRouter.put("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  requireRole("superAdmin", ctx);
  try {
    const { id } = ctx.params;
    const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
    const bank = await updateBank(id, body);
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Bank updated successfully",
      data: bank
    };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: "Failed to update bank",
      error: error instanceof Error ? error.message : "Bad request"
    };
  }
});

// Delete bank (superAdmin only)
banksRouter.delete("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  requireRole("superAdmin", ctx);
  try {
    const { id } = ctx.params;
    const result = await deleteBank(id);
    ctx.response.status = 200;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: "Failed to delete bank",
      error: error instanceof Error ? error.message : "Bad request"
    };
  }
});
