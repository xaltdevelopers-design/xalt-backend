// Centralized re-exports of third-party deps for easier version management
// Using fully-qualified URLs to avoid tooling resolution issues

// OAK Framework
export { Application, Router, Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// Console Colors
export { green, yellow, red, bold } from "https://deno.land/std@0.224.0/fmt/colors.ts";

// MongoDB via NPM driver (BSON v6 compatible and recommended)
export { MongoClient, ObjectId } from "npm:mongodb@6.8.0";

// Environment Variables
export { load as loadEnv } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Validation (ZOD)
export { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// Bcrypt
export * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

// JWT
export { create, verify, getNumericDate } from "https://deno.land/x/djwt@v2.9/mod.ts";
