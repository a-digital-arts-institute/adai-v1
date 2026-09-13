// The three intake emails (docs/URL-INTAKE-SPEC.md §11): login link,
// draft ready (or failed), receipt. Short, plain text with an HTML twin,
// no tracking. Sending goes through src/utils/mail.ts (stdout in dev).

import type { DatabaseSync } from "node:sqlite";
import { sendMail, textToHtml } from "../utils/mail.js";
import { issueMagicLink, baseUrl } from "./auth.js";
import type { Draft } from "./draft.js";
import type { ConfirmResult } from "./draft.js";

function from(): string {
  return process.env.INTAKE_FROM || "A(DAI) <contribute@fragcolor.com>";
}

function replyTo(): string[] {
  return (process.env.ADMIN_NOTIFY_EMAILS || "").split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

async function send(to: string, subject: string, text: string): Promise<void> {
  try {
    await sendMail({ from: from(), to: [to], replyTo: replyTo(), subject, text, html: textToHtml(text) });
  } catch (e: any) {
    console.error(`[intake-mail] failed to send "${subject}" to ${to}: ${e?.message ?? e}`);
  }
}

export async function sendLoginEmail(db: DatabaseSync, email: string, ip: string | null, redirect?: string | null): Promise<void> {
  const link = issueMagicLink(db, { email, purpose: "login", redirect: redirect ?? null, ip });
  const text =
    `Here is your A(DAI) sign-in link. It works once and expires in 15 minutes:\n\n${link.url}\n\n` +
    `If you did not ask for this, ignore it.`;
  await send(email, "Your A(DAI) sign-in link", text);
}

export function candidateCounts(d: Draft): { works: number; shows: number; people: number; images: number; questions: number; known: number } {
  let works = 0, shows = 0, people = 0, images = 0, questions = 0, known = 0;
  for (const c of d.candidates) {
    if (c.kind === "node") {
      if (c.node.type === "artwork") works++;
      else if (c.node.type === "project" || c.node.type === "institution") shows++;
      else people++;
    } else if (c.kind === "image") images++;
    else if (c.kind === "question") questions++;
    else if (c.kind === "known") known++;
  }
  return { works, shows, people, images, questions, known };
}

export async function sendDraftReadyEmail(db: DatabaseSync, email: string, draft: Draft): Promise<void> {
  const link = issueMagicLink(db, { email, purpose: "draft_ready", redirect: `/draft/${draft.id}` });
  const c = candidateCounts(draft);
  const text =
    `Your draft from ${draft.source_domain} is ready.\n\n` +
    (draft.summary ? `${draft.summary}\n\n` : "") +
    `${c.works} works · ${c.shows} shows and venues · ${c.people} people and organisations · ${c.images} images · ${c.known} already in A(DAI) · ${c.questions} questions for you\n\n` +
    `Review and confirm what you want to submit:\n${link.url}\n\n` +
    `Nothing goes into A(DAI) until you press Confirm. The link signs you in and is valid for 7 days.`;
  await send(email, `Your draft from ${draft.source_domain} is ready`, text);
}

export async function sendDraftFailedEmail(db: DatabaseSync, email: string, draft: Draft): Promise<void> {
  const link = issueMagicLink(db, { email, purpose: "draft_ready", redirect: `/draft/${draft.id}` });
  const text =
    `We could not read ${draft.source_domain}.\n\n` +
    `${draft.error ? `What happened: ${draft.error}\n\n` : ""}` +
    `You can try another URL here:\n${link.url}\n\n` +
    `Reply to this email if you think the site should have worked and a person will look.`;
  await send(email, `We could not read ${draft.source_domain}`, text);
}

export async function sendReceiptEmail(db: DatabaseSync, email: string, draft: Draft, result: ConfirmResult): Promise<void> {
  const link = issueMagicLink(db, { email, purpose: "receipt", redirect: `/batch/${draft.id}` });
  const n = result.created_nodes.length + result.linked_nodes.length + result.edges.length + result.images.length + result.patched_nodes.length;
  const outcome = result.status === "live"
    ? "Everything is live in A(DAI) now."
    : "Your submission is in the curator review queue; you will be able to see its state on the receipt page.";
  const subjectLine = draft.subject_node_id && !draft.subject_node_id.startsWith("cid:")
    ? `\nSubject profile: ${baseUrl()}/${draft.subject_node_id.split(":")[0]}/${encodeURIComponent(draft.subject_node_id.split(":").slice(1).join(":"))}\n`
    : "";
  const text =
    `Received: ${n} items from ${draft.source_domain}.\n\n${outcome}\n\n` +
    `Receipt (batch ${draft.id}):\n${link.url}\n${subjectLine}\n` +
    `Created: ${result.created_nodes.length} · linked to existing: ${result.linked_nodes.length} · relations: ${result.edges.length} · images: ${result.images.length}` +
    (result.skipped.length ? `\nSkipped: ${result.skipped.map((s) => s.reason).join("; ")}` : "") +
    `\n\nThank you for contributing to the commons.`;
  await send(email, `Received: ${n} items from ${draft.source_domain}`, text);
}
