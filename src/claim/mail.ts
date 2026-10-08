// Claim emails (docs/CLAIM-SPEC.md): the decision, a contending claim, a
// claim request for the admins, a peer invite. Plain text, same transport
// as the intake (stdout in dev).

import type { DatabaseSync } from "node:sqlite";
import { issueMagicLink, baseUrl, emailFor } from "../intake/auth.js";
import { send, replyTo } from "../intake/mail.js";
import { nodeHref } from "./pages.js";

function nodeLabel(db: DatabaseSync, nodeId: string): { name: string; url: string } {
  const n = db.prepare("SELECT name, slug FROM nodes WHERE id = ?").get(nodeId) as any;
  return { name: n?.name ?? nodeId, url: `${baseUrl()}${nodeHref(nodeId, n?.slug)}` };
}

export async function sendClaimDecisionEmail(db: DatabaseSync, contributorId: string, nodeId: string, approved: boolean, reason?: string | null): Promise<void> {
  const email = emailFor(db, contributorId);
  if (!email) return;
  const n = nodeLabel(db, nodeId);
  if (approved) {
    const link = issueMagicLink(db, { email, purpose: "receipt", redirect: `/me?node=${encodeURIComponent(nodeId)}` });
    await send(email, `Your claim on ${n.name} is approved`,
      `${n.name} is now marked as claimed by you on A(DAI):\n${n.url}\n\n` +
      `Your log — every relation the commons holds about the page, where you can add context, contest, or invite the people at the other end:\n${link.url}\n\n` +
      `The link signs you in and is valid for 7 days.`);
  } else {
    await send(email, `Your claim on ${n.name}`,
      `A curator did not approve your claim on ${n.name}.` + (reason ? `\n\nTheir note: ${reason}` : "") +
      `\n\nReply to this email if you want a person to look again.`);
  }
}

/** To the existing claimants of a practitioner someone else now claims too. */
export async function sendClaimConflictEmail(db: DatabaseSync, existingIds: string[], nodeId: string, claimantName: string): Promise<void> {
  const n = nodeLabel(db, nodeId);
  for (const id of existingIds) {
    const email = emailFor(db, id);
    if (!email) continue;
    await send(email, `Someone else claims ${n.name}`,
      `${claimantName || "Someone"} has asked to claim ${n.name} on A(DAI), which you have claimed:\n${n.url}\n\n` +
      `A curator will decide. If this is not right, reply to this email and say so.`);
  }
}

/** To the admins: a claim waits for review (signed-in or signed-out). */
export async function sendAdminClaimRequestEmail(db: DatabaseSync, nodeId: string, who: string, evidence: string | null): Promise<void> {
  const admins = replyTo();
  if (!admins.length) return;
  const n = nodeLabel(db, nodeId);
  const text =
    `${who} asks to claim ${n.name}:\n${n.url}\n\n` +
    (evidence ? `Their evidence:\n${evidence}\n\n` : "") +
    `Review: ${baseUrl()}/review?kind=claim`;
  for (const to of admins) await send(to, `A(DAI) claim request: ${n.name}`, text);
}

export async function sendPeerInviteEmail(
  db: DatabaseSync,
  args: { email: string; inviterName: string; inviterNode: string; nodeId: string; edgeType: string; message?: string | null }
): Promise<void> {
  const n = nodeLabel(db, args.nodeId);
  const from = nodeLabel(db, args.inviterNode);
  const link = issueMagicLink(db, { email: args.email, purpose: "receipt", redirect: `/me?node=${encodeURIComponent(args.nodeId)}` });
  await send(args.email, `${args.inviterName} invites you to A(DAI)`,
    `${args.inviterName} (${from.name}) invites you to claim your page on A(DAI), a digital arts knowledge commons:\n${n.url}\n\n` +
    `The commons links you through: ${from.name} ${args.edgeType.toLowerCase().replace(/_/g, " ")} ${n.name}.\n\n` +
    (args.message ? `Their note: ${args.message}\n\n` : "") +
    `Open your log — see what the commons holds about you, add context or contest it:\n${link.url}\n\n` +
    `The link signs you in and is valid for 7 days. If this is not you, ignore it.`);
}

/**
 * After a curator decided a queue item: if it was a claim, tell the
 * claimant. The shared review path stays synchronous and mail-free; the
 * HTTP endpoints call this once they have answered.
 */
export async function notifyAfterReview(db: DatabaseSync, queueId: string, approved: boolean, reason: string | null): Promise<void> {
  const c = db.prepare("SELECT contributor_id, node_id, status FROM node_claims WHERE queue_id = ?").get(queueId) as any;
  if (!c || (approved ? c.status !== "approved" : c.status !== "rejected")) return;
  try {
    await sendClaimDecisionEmail(db, c.contributor_id, c.node_id, approved, reason);
  } catch (e: any) {
    console.error("[claim-mail] decision email failed:", e?.message ?? e);
  }
}
