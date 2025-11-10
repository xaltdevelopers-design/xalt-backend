import { Context, create, verify, getNumericDate } from "../deps.ts";
import { findByEmail, findByIdRaw } from "../controllers/users.ts";
import { getConfig } from "../utils/env.ts";

interface JwtPayload {
  iss: string;
  sub: string; // user id
  roles: string[];
  exp: number;
}

const HEADER_KEY = "authorization";

export async function signToken(user: { _id?: { $oid: string }; roles: string[] }) {
  const { JWT_SECRET } = await getConfig();
  const key = await buildKey(JWT_SECRET);
  const payload: JwtPayload = {
    iss: "xalt",
    sub: user._id!.$oid,
    roles: user.roles,
    exp: getNumericDate(60 * 60), // 1h
  };
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

async function buildKey(secret: string) {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function authMiddleware(ctx: Context, next: () => Promise<unknown>) {
  const header = ctx.request.headers.get(HEADER_KEY);
  if (!header || !header.startsWith("Bearer ")) {
    ctx.state.currentUser = null;
    // Don't set error here, let requireAuth handle it if needed
    return await next();
  }
  const token = header.substring("Bearer ".length);
  const { JWT_SECRET } = await getConfig();
  const key = await buildKey(JWT_SECRET);
  try {
    const payload = await verify(token, key);
    console.log("JWT Payload:", payload);
    const user = await findByIdRaw(payload.sub);
    console.log("Found user:", user);
    ctx.state.currentUser = user ? { _id: user._id, roles: user.roles, email: user.email } : null;
  } catch (e) {
    console.error("Auth error:", e);
    ctx.state.currentUser = null;
  }
  await next();
}

// removed helper findByEmailOrId in favor of direct findByIdRaw

export function requireAuth(ctx: Context): asserts ctx is Context & { state: { currentUser: { _id: { $oid: string }; roles: string[] } } } {
  if (!ctx.state.currentUser) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      message: "Authorization token required. Please provide a valid token in the 'Authorization' header.",
      error: "Unauthorized"
    };
    throw new Error("Unauthorized");
  }
}

export function requireRole(role: string, ctx: Context) {
  requireAuth(ctx);
  if (!ctx.state.currentUser.roles.includes(role)) {
    ctx.response.status = 403;
    ctx.response.body = {
      success: false,
      message: `You do not have permission to access this resource. Required role: ${role}`,
      error: "Forbidden"
    };
    throw new Error("Forbidden");
  }
}
