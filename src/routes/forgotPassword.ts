import { Router, Context } from "../deps.ts";
import { findByEmail } from "../controllers/users.ts";
import { sendMail } from "../utils/email.ts";

export const forgotPasswordRouter = new Router({ prefix: "/api/auth" });

// POST /api/auth/forgot-password
forgotPasswordRouter.post("/forgot-password", async (ctx: Context) => {
  const body = ctx.request.hasBody ? await ctx.request.body({ type: "json" }).value : {};
  const { email } = body;
  if (!email) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: "Email is required.",
      error: "Missing email field"
    };
    return;
  }
  const user = await findByEmail(email);
  if (!user) {
    ctx.response.status = 404;
    ctx.response.body = {
      success: false,
      message: "No user found with this email.",
      error: "User not found"
    };
    return;
  }
  // Generate a dummy reset token (in real app, store in DB with expiry)
  const resetToken = crypto.randomUUID();
  const resetLink = `${Deno.env.get("FRONTEND_URL") || "http://localhost:3000"}/reset-password?token=${resetToken}`;
  let mailSent = false;
  let mailError = null;
  try {
    await sendMail({
      to: email,
      subject: "Password Reset Request",
      content: `Hello,\n\nClick the link below to reset your password:\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nXalt Team`
    });
    mailSent = true;
  } catch (err) {
    mailError = err?.message || String(err);
  }
  ctx.response.body = {
    success: true,
    message: mailSent
      ? "If this email is registered, a password reset link will be sent."
      : "Could not send email. Please try again later.",
    data: { email, resetLink: mailSent ? resetLink : undefined },
    error: mailError
  };
});
