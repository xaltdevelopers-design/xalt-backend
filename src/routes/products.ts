// @ts-ignore: Deno namespace is available in Deno runtime
// deno-lint-ignore no-explicit-any
declare const Deno: any;
import { Router, Context } from "../deps.ts";
import { addProduct, listProducts, getProduct, updateProduct, deleteProduct } from "../controllers/products.ts";
import { authMiddleware, requireAuth } from "../middleware/auth.ts";

export const productsRouter = new Router({ prefix: "/api/products" });

// Attach auth middleware for all product routes
productsRouter.use(authMiddleware);

// List all products
productsRouter.get("/", async (ctx: Context) => {
  requireAuth(ctx);
  try {
    const products = await listProducts();
    const baseUrl = `${ctx.request.url.protocol}//${ctx.request.url.host}`;
    const productsWithId = products.map((p: any) => {
      let productImage = null;
      if (Array.isArray(p.productImages) && p.productImages.length > 0) {
        productImage = baseUrl + p.productImages[0];
      } else if (typeof p.productImages === "string") {
        productImage = baseUrl + p.productImages;
      }
      const { productImages, ...rest } = p;
      return {
        ...rest,
        productImage,
        id: p._id?.$oid || p._id || null
      };
    });
    ctx.response.body = {
      success: true,
      message: "Products fetched successfully",
      error: null,
      data: productsWithId
    };
  } catch (e: any) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Failed to fetch products",
      error: e instanceof Error ? e.message : e,
      data: null
    };
  }
});

// Add product
// Add product (supports multipart/form-data for image upload)
productsRouter.post("/", async (ctx: Context) => {
  requireAuth(ctx);
  const contentType = ctx.request.headers.get("content-type") || "";
  let body: any = {};
  let productImages: string[] = [];
  // ...existing code...
  // After body is constructed, before addProduct:
  // Debug: log parsed body
  // (This should be placed just before calling addProduct)
  if (contentType.includes("multipart/form-data")) {
    const form = await ctx.request.body({ type: "form-data" }).value;
    // Oak returns FormDataReader, use read() to get fields/files
    const { fields, files } = await form.read();
    // Debug: log fields and files
    console.log("Parsed fields:", fields);
    console.log("Parsed files:", files);
    body = { ...fields };
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file) {
          let content = file.content;
          // If content is undefined, read from file.filename
          if (!content && file.filename) {
            try {
              content = await Deno.readFile(file.filename);
            } catch (e) {
              console.error("Failed to read uploaded file from temp path", file.filename, e);
              continue;
            }
          }
          if (content) {
            const ext = file.originalName?.split(".").pop() || "jpg";
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const filePath = `uploads/${fileName}`;
            await Deno.writeFile(filePath, content);
            productImages.push(`/uploads/${fileName}`);
          }
        }
      }
      if (productImages.length) {
        body.productImages = productImages;
      }
    }
    // Convert numeric fields
    if (body.price) body.price = Number(body.price);
    if (body.inStockQty) body.inStockQty = Number(body.inStockQty);
    if (body.discountValue) body.discountValue = Number(body.discountValue);
  } else {
    body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  }
  try {
    // Debug: log parsed body (after body is constructed)
    console.log("Parsed form-data body:", body);
    const product = await addProduct(body);
    ctx.response.status = 201;
      ctx.response.body = {
        success: true,
        message: "Product added successfully",
        error: null,
        data: (() => {
          let productImage = null;
          if (Array.isArray(product.productImages) && product.productImages.length > 0) {
            productImage = product.productImages[0];
          } else if (typeof product.productImages === "string") {
            productImage = product.productImages;
          }
          const { productImages, ...rest } = product;
          return {
            ...rest,
            productImage,
            id: product?._id?.$oid || product?._id || null
          };
        })()
      };
  } catch (e: any) {
    ctx.response.status = 400;
    let message = e instanceof Error ? e.message : "Bad Request";
    let error = e instanceof Error ? e.message : e;
    // Zod error formatting
    if (e && typeof e === "object" && "errors" in e && Array.isArray((e as any).errors)) {
      message = "Validation error";
      error = (e as any).errors.map((err: any) => ({
        path: Array.isArray(err.path) ? err.path.join(".") : err.path,
        message: err.message
      }));
    } else if (typeof error === "string") {
      // Try to parse stringified JSON error
      try {
        const parsed = JSON.parse(error);
        if (Array.isArray(parsed)) {
          message = "Validation error";
          error = parsed.map((err: any) => ({
            path: Array.isArray(err.path) ? err.path.join(".") : err.path,
            message: err.message
          }));
        }
      } catch {}
    }
    ctx.response.body = {
      success: false,
      message,
      error,
      data: null
    };
  }
});

// Get product by id
productsRouter.get("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  try {
    const product = await getProduct(id);
    if (!product) {
      ctx.response.status = 404;
        ctx.response.body = {
          success: false,
          message: "Product not found",
          error: "Not Found",
          data: null
        };
      return;
    }
    const baseUrl = `${ctx.request.url.protocol}//${ctx.request.url.host}`;
    let productImage = null;
    if (Array.isArray(product.productImages) && product.productImages.length > 0) {
      productImage = baseUrl + product.productImages[0];
    } else if (typeof product.productImages === "string") {
      productImage = baseUrl + product.productImages;
    }
    const { productImages, ...rest } = product;
    ctx.response.body = {
      success: true,
      message: "Product fetched successfully",
      error: null,
      data: {
        ...rest,
        productImage,
        id: product?._id?.$oid || product?._id || null
      }
    };
  } catch (e: unknown) {
    ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: e instanceof Error ? e.message : "Bad Request",
        error: e instanceof Error ? e.message : e,
        data: null
      };
  }
});

// Update product
productsRouter.put("/:id", async (ctx: Context) => {
  requireAuth(ctx);
  // Accept both Mongo _id and string id
  let id = ctx.params.id;
  let body: any = {};
  let productImages: string[] = [];
  const contentType = ctx.request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await ctx.request.body({ type: "form-data" }).value;
    const { fields, files } = await form.read();
    body = { ...fields };
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file) {
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
            const ext = file.originalName?.split(".").pop() || "jpg";
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const filePath = `uploads/${fileName}`;
            await Deno.writeFile(filePath, content);
            productImages.push(`/uploads/${fileName}`);
          }
        }
      }
      if (productImages.length) {
        body.productImages = productImages;
      }
    }
    // Convert numeric fields
    if (body.price) body.price = Number(body.price);
    if (body.inStockQty) body.inStockQty = Number(body.inStockQty);
    if (body.discountValue) body.discountValue = Number(body.discountValue);
  } else {
    body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  }
  // If id is not in URL, try to get from body
  if (!id && body.id) {
    id = body.id;
  }
  if (!id) {
    ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Product id is required in URL or body",
        error: "Bad Request",
        data: null
      };
    return;
  }
  if (id.length !== 24 && /^[a-fA-F0-9]{24}$/.test(id)) {
    ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Invalid product id",
        error: "Bad Request",
        data: null
      };
    return;
  }
  try {
    const updated = await updateProduct(id, body);
    if (!updated) {
      ctx.response.status = 404;
        ctx.response.body = {
          success: false,
          message: "Product not found",
          error: "Not Found",
          data: null
        };
      return;
    }
      ctx.response.body = {
        success: true,
        message: "Product updated successfully",
        error: null,
        data: {
          ...updated,
          id: updated?._id?.$oid || updated?._id || null
        }
      };
  } catch (e: unknown) {
    ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: e instanceof Error ? e.message : "Bad Request",
        error: e instanceof Error ? e.message : e,
        data: null
      };
  }
});

// Delete product
productsRouter.delete(":id", async (ctx: Context) => {
  requireAuth(ctx);
  const id = ctx.params.id!;
  try {
    await deleteProduct(id);
    ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Product deleted successfully",
        error: null,
        data: null
      };
  } catch (e: unknown) {
    ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: e instanceof Error ? e.message : "Bad Request",
        error: e instanceof Error ? e.message : e,
        data: null
      };
  }
});
