import { Router, Context } from "../deps.ts";
import { listInvoice, getInvoice, updateInvoice, deleteInvoice } from "../controllers/invoice.ts";
import { requireAuth } from "../middleware/auth.ts";
// @ts-ignore: Deno namespace is available in Deno runtime
// deno-lint-ignore no-explicit-any
declare const Deno: any;
export const invoiceRouter = new Router({ prefix: "/api/invoice" });

function getBaseUrl(ctx: Context) {
  // Prefer env BASE_URL if set, else use request origin
  try {
    // @ts-ignore Deno
    const base = typeof Deno !== "undefined" && Deno.env && Deno.env.get ? Deno.env.get("BASE_URL") : undefined;
    if (base) return base;
  } catch {}
  return `${ctx.request.url.protocol}//${ctx.request.url.host}`;
}

// List all invoices
invoiceRouter.get("/", async (ctx: Context) => {
  requireAuth(ctx);
  const items = await listInvoice();
  const baseUrl = getBaseUrl(ctx);
  // map item images to full URL if they are local paths
  const mapped = items.map((invoice: any) => {
    if (Array.isArray(invoice.items)) {
      invoice.items = invoice.items.map((it: any) => ({
        ...it,
        image: it.image && it.image.startsWith("/uploads/") ? baseUrl + it.image : it.image
      }));
    }
    return invoice;
  });
  ctx.response.body = { success: true, data: mapped };
});

// Get invoice by id
invoiceRouter.get("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  const invoice = await getInvoice(id);
  if (!invoice) {
    ctx.response.status = 404;
    ctx.response.body = { success: false, message: "Not Found", data: null };
    return;
  }
  const baseUrl = getBaseUrl(ctx);
  if (Array.isArray(invoice.items)) {
    invoice.items = invoice.items.map((it: any) => ({
      ...it,
      image: it.image && it.image.startsWith("/uploads/") ? baseUrl + it.image : it.image
    }));
  }
  ctx.response.body = { success: true, data: invoice };
});

// Update invoice (supports multipart/form-data)
invoiceRouter.put("/:id", async (ctx: Context) => {
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
    const updated = await updateInvoice(id, body);
    const baseUrl = getBaseUrl(ctx);
    if (updated && Array.isArray(updated.items)) {
      updated.items = updated.items.map((it: any) => ({
        ...it,
        image: it.image && it.image.startsWith("/uploads/") ? baseUrl + it.image : it.image
      }));
    }
    ctx.response.body = { success: true, data: updated };
  } catch (e: any) {
    ctx.response.status = e?.status || 400;
    ctx.response.body = { success: false, message: e?.message || "Bad Request", error: e?.error || null };
  }
});

// Delete invoice
invoiceRouter.delete("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  try {
    const result = await deleteInvoice(id);
    ctx.response.body = { success: true, data: result };
  } catch (e: any) {
    ctx.response.status = e?.status || 400;
    ctx.response.body = { success: false, message: e?.message || "Bad Request", error: e?.error || null };
  }
});
