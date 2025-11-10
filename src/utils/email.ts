
// Send email using Gmail SMTP direct (App Password required)
// Set these env vars: GMAIL_USER, GMAIL_PASS, GMAIL_FROM
// Uses https://api.brevo.com/v3/smtp/email as a fallback relay (free, reliable)

export interface SendMailOptions {
  to: string;
  subject: string;
  content: string;
}


// WARNING: This is for dev/testing only. For production, use App Password and never hardcode your real Gmail password.
export async function sendMail({ to, subject, content }: SendMailOptions) {
  const from = "xalt.developers@gmail.com";
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) throw new Error("BREVO_API_KEY env variable required for email sending");

  const payload = {
    sender: { name: "Xalt", email: from },
    to: [{ email: to }],
    subject,
    htmlContent: `<pre>${content}</pre>`
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to send email: ${text}`);
  }
  return true;
}
