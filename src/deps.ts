// Centralized re-exports of third-party deps for easier version management
// Using fully-qualified URLs to avoid tooling resolution issues
export { Application, Router, Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
export { green, yellow, red, bold } from "https://deno.land/std@0.224.0/fmt/colors.ts";
export {
	MongoClient,
	Database,
	Collection,
	ObjectId,
} from "https://deno.land/x/mongo@v0.32.0/mod.ts";
export { load as loadEnv } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
export { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
export * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
export { create, verify, getNumericDate } from "https://deno.land/x/djwt@v2.9/mod.ts";
