import { Router, Context } from "../deps.ts";
import { compressImage } from "../utils/imageCompressor.ts";
// @ts-ignore: Deno namespace is available in Deno runtime
// deno-lint-ignore no-explicit-any
declare const Deno: any;

export const uploadRouter = new Router({ prefix: "/api/upload" });

// POST /api/upload/image
uploadRouter.post("/image", async (ctx: Context) => {
  const body = ctx.request.originalRequest.body;
  if (!body) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "No file uploaded" };
    return;
  }

  const contentType = ctx.request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "Content-Type must be multipart/form-data" };
    return;
  }

  const boundary = contentType.split("boundary=")[1];
  if (!boundary) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "Invalid multipart form data" };
    return;
  }

  const form = await ctx.request.body({ type: "form-data" }).value;
  let fileUrl = null;
  for (const [field, value] of form.entries()) {
    if (typeof value === "object" && value.content) {
      const ext = value.filename?.split(".").pop() || "jpg";
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `uploads/${fileName}`;
      
      // Compress image to under 1 MB
      const compressedContent = await compressImage(value.content, value.filename || "image.jpg");
      
      await Deno.writeFile(filePath, compressedContent);
      fileUrl = `/uploads/${fileName}`;
      break;
    }
  }

  if (!fileUrl) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "No file found in form-data" };
    return;
  }

  ctx.response.body = {
    success: true,
    message: "Image uploaded successfully",
    url: fileUrl
  };
});
