// Transactional mail over the Resend HTTP API (global fetch, no SDK).
//
// One function for every sender in the codebase — the curator digest
// (src/notify/digest.ts) and the URL-intake emails (src/intake/mail.ts).
// Without RESEND_API_KEY the message is logged to stdout in full; that is
// the dev transport, and it is what makes magic links usable locally.

export interface MailMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string[];
}

export interface MailResult {
  id: string;
  transport: "resend" | "stdout";
}

export function resendApiKey(): string | null {
  // MAIL_TRANSPORT=stdout forces the dev transport even when a Resend key is
  // present (a local .env usually has the real key for the digest CLI).
  if (process.env.MAIL_TRANSPORT === "stdout") return null;
  return process.env.RESEND_API_KEY || null;
}

export async function sendMail(msg: MailMessage): Promise<MailResult> {
  const apiKey = resendApiKey();
  if (!apiKey) {
    const banner = "-".repeat(72);
    console.log(
      `\n${banner}\n[mail] (stdout transport — RESEND_API_KEY unset)\nFrom: ${msg.from}\nTo: ${msg.to.join(", ")}` +
        (msg.replyTo?.length ? `\nReply-To: ${msg.replyTo.join(", ")}` : "") +
        `\nSubject: ${msg.subject}\n\n${msg.text}\n${banner}\n`
    );
    return { id: "", transport: "stdout" };
  }
  const body: Record<string, unknown> = {
    from: msg.from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  };
  if (msg.replyTo?.length) body.reply_to = msg.replyTo;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Resend API ${resp.status}: ${text}`);
  try {
    return { id: (JSON.parse(text) as { id: string }).id ?? "", transport: "resend" };
  } catch {
    return { id: "", transport: "resend" };
  }
}

/** Minimal HTML twin for a plain-text email: escaped, paragraphs, links clickable. */
export function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = text.split(/\n{2,}/).map((p) => {
    const withLinks = esc(p).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}">${u}</a>`);
    return `<p style="margin:0 0 14px;line-height:1.5">${withLinks.replace(/\n/g, "<br>")}</p>`;
  });
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a1a;max-width:560px;margin:24px auto;padding:0 16px">${paras.join("")}</body></html>`;
}
