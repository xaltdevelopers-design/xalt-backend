
import { Router, Context } from "../deps.ts";
import { createPI, listPI, getPI, updatePI, deletePI, togglePIRetrieve, getPIsByRetrieve } from "../controllers/pi.ts";
import { requireAuth } from "../middleware/auth.ts";
// @ts-ignore: Deno namespace is available in Deno runtime
// deno-lint-ignore no-explicit-any
declare const Deno: any;
export const piRouter = new Router({ prefix: "/api/pi" });

function getBaseUrl(ctx: Context) {
  // Prefer env BASE_URL if set, else use request origin
  try {
    // @ts-ignore Deno
    const base = typeof Deno !== "undefined" && Deno.env && Deno.env.get ? Deno.env.get("BASE_URL") : undefined;
    if (base) return base;
  } catch {}
  return `${ctx.request.url.protocol}//${ctx.request.url.host}`;
}

// Get PIs by retrieve status - Must come before /:id route
piRouter.get("/retrieve/:isRetrieve", async (ctx: Context) => {
  requireAuth(ctx);
  const isRetrieve = ctx.params.isRetrieve === "true";
  try {
    const items = await getPIsByRetrieve(isRetrieve);
    const baseUrl = getBaseUrl(ctx);
    const mapped = items.map((pi: any) => {
      if (Array.isArray(pi.items)) {
        pi.items = pi.items.map((it: any) => ({
          ...it,
          image: it.image && it.image.startsWith("/uploads/") ? baseUrl + it.image : it.image
        }));
      }
      return pi;
    });
    ctx.response.body = {
      success: true,
      message: "PIs fetched successfully",
      data: mapped
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

// Toggle PI retrieve status - Must come before /:id route
piRouter.patch("/toggle-retrieve/:id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  try {
    const updated = await togglePIRetrieve(id);
    ctx.response.body = {
      success: true,
      message: "PI retrieve status toggled successfully",
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

// List
piRouter.get("/", async (ctx: Context) => {
  requireAuth(ctx);
  const items = await listPI();
  const baseUrl = getBaseUrl(ctx);
  // map item images to full URL if they are local paths
  const mapped = items.map((pi: any) => {
    if (Array.isArray(pi.items)) {
      pi.items = pi.items.map((it: any) => ({
        ...it,
        image: it.image && it.image.startsWith("/uploads/") ? baseUrl + it.image : it.image
      }));
    }
    return pi;
  });
  ctx.response.body = { success: true, data: mapped };
});

// Create (supports multipart/form-data with files)
piRouter.post("/", async (ctx: Context) => {
  requireAuth(ctx);
  const contentType = ctx.request.headers.get("content-type") || "";
  let body: any = {};
  let filePaths: string[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await ctx.request.body({ type: "form-data" }).value;
    const { fields, files } = await form.read();
    // Expect a JSON payload in a field named 'payload' or fields directly
    if (fields && fields.payload) {
      try {
        body = JSON.parse(fields.payload as string);
      } catch {
        body = { ...fields };
      }
    } else {
      body = { ...fields };
    }
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (!file) continue;
        let content = file.content;
        if (!content && file.filename) {
          try {
            content = await Deno.readFile(file.filename);
          } catch (e) {
            console.error("Failed to read uploaded file from temp path", file.filename, e);
            continue;
          }
        }
        if (content) {
          const ext = file.originalName?.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const filePath = `uploads/${fileName}`;
          await Deno.writeFile(filePath, content);
          filePaths.push(`/${filePath}`);
        }
      }
    }
    // If body.items exists, map filePaths to items (ensure image field as URL)
    const baseUrl = getBaseUrl(ctx);
    if (Array.isArray(body.items)) {
      for (let i = 0; i < body.items.length; i++) {
        body.items[i].image = filePaths[i] ? baseUrl + filePaths[i] : "";
      }
    }
  } else {
    body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  }

  // Type conversion for form-data fields
  if (body) {
    if (body.clientId !== undefined) {
      const parsedId = Number(body.clientId);
      body.clientId = isNaN(parsedId) ? String(body.clientId) : parsedId;
    }
    if (body.subtotal !== undefined) body.subtotal = Number(body.subtotal);
    if (body.discount !== undefined) body.discount = Number(body.discount);
    if (body.totalAmount !== undefined) body.totalAmount = Number(body.totalAmount);
    if (body.taxPercent !== undefined) body.taxPercent = Number(body.taxPercent);
    if (body.taxAmount !== undefined) body.taxAmount = Number(body.taxAmount);
    if (body.grandTotal !== undefined) body.grandTotal = Number(body.grandTotal);
    // Parse items if it's a string (from form-data)
    if (typeof body.items === "string") {
      try {
        body.items = JSON.parse(body.items);
      } catch {
        body.items = [];
      }
    }
    if (!Array.isArray(body.items)) {
      body.items = [];
    }
    // If items array is missing or empty, return error
    if (!body.items || body.items.length === 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Items array required and must have at least one item." };
      return;
    }
  }
  try {
    const created = await createPI(body);
    const baseUrl = getBaseUrl(ctx);
    if (created && Array.isArray(created.items)) {
      created.items = created.items.map((it: any) => ({
        ...it,
        image: it.image && it.image.startsWith("/uploads/") ? baseUrl + it.image : it.image
      }));
    }
    ctx.response.status = 201;
    ctx.response.body = { success: true, data: created };
  } catch (e: any) {
    ctx.response.status = e?.status || 400;
    ctx.response.body = { success: false, message: e?.message || "Bad Request", error: e?.error || null };
  }
});

// Get by id
piRouter.get("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  const pi = await getPI(id);
  if (!pi) {
    ctx.response.status = 404;
    ctx.response.body = { success: false, message: "Not Found", data: null };
    return;
  }
  const baseUrl = getBaseUrl(ctx);
  if (Array.isArray(pi.items)) {
    pi.items = pi.items.map((it: any) => ({
      ...it,
      image: it.image && it.image.startsWith("/uploads/") ? baseUrl + it.image : it.image
    }));
  }
  ctx.response.body = { success: true, data: pi };
});

// Update (supports multipart/form-data)
piRouter.put("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  const contentType = ctx.request.headers.get("content-type") || "";
  let body: any = {};
  let filePaths: string[] = [];
  if (contentType.includes("multipart/form-data")) {
    const form = await ctx.request.body({ type: "form-data" }).value;
    const { fields, files } = await form.read();
    if (fields && fields.payload) {
      try {
        body = JSON.parse(fields.payload as string);
      } catch {
        body = { ...fields };
      }
    } else {
      body = { ...fields };
    }
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (!file) continue;
        let content = file.content;
        if (!content && file.filename) {
          try {
            content = await Deno.readFile(file.filename);
          } catch (e) {
            console.error("Failed to read uploaded file from temp path", file.filename, e);
            continue;
          }
        }
        if (content) {
          const ext = file.originalName?.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const filePath = `uploads/${fileName}`;
          await Deno.writeFile(filePath, content);
          filePaths.push(`/${filePath}`);
        }
      }
    }
    if (Array.isArray(body.items) && filePaths.length) {
      for (let i = 0; i < Math.min(body.items.length, filePaths.length); i++) {
        if (!body.items[i].image) body.items[i].image = filePaths[i];
      }
    }
  } else {
    body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  }
  try {
    const updated = await updatePI(id, body);
    const baseUrl = getBaseUrl(ctx);
    if (updated && Array.isArray(updated.items)) {
      updated.items = updated.items.map((it: any) => ({
        ...it,
        image: it.image && it.image.startsWith("/uploads/") ? baseUrl + it.image : it.image
      }));
    }
    ctx.response.body = { success: true, data: updated };
  } catch (e: any) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: e?.message || "Bad Request", error: e?.error || null };
  }
});

// Delete
piRouter.delete("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  await deletePI(id);
  ctx.response.status = 204;
});
