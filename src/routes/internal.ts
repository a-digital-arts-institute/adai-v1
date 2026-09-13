// /internal/intake/* — the surface the intake worker talks to
// (docs/URL-INTAKE-SPEC.md §9.2). Header X-Worker-Key, constant-time
// compared against WORKER_KEY. Not mounted at all when the key is unset.
//
// ⚠️ Trust promise 1: this file must never import materialise*,
// insertSignal, or src/r2.ts. tests/intake-imports.test.ts checks.

import crypto from "node:crypto";
import express, { Router, type Request, type Response, type NextFunction } from "express";
import { getDb } from "../db.js";
import { JSON_HEADERS } from "../templates.js";
import {
  claimJob,
  heartbeat,
  finishPass,
  runDraftTool,
  workerAddPage,
  workerAddMessage,
  markNotified,
  mustGetDraft,
  getDraft,
  DRAFT_TOOL_NAMES,
  DraftError,
} from "../intake/draft.js";
import { CandidateError } from "../intake/candidate.js";
import { runIntakeTool, isIntakeTool } from "../intake/tools.js";
import { emailFor } from "../intake/auth.js";
import { sendDraftReadyEmail, sendDraftFailedEmail } from "../intake/mail.js";

const router = Router();

export function workerKey(): string | null {
  const k = process.env.WORKER_KEY;
  return k && k.length >= 16 ? k : null;
}

function requireWorker(req: Request, res: Response, next: NextFunction): void {
  const key = workerKey();
  const given = req.header("x-worker-key") ?? "";
  if (!key || !given || given.length !== key.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key))) {
    res.status(401).json({ error: "bad_worker_key" });
    return;
  }
  next();
}

function sendError(res: Response, e: unknown): void {
  if (e instanceof DraftError) {
    res.status(e.status).set(JSON_HEADERS).json({ error: e.code, message: e.message });
  } else if (e instanceof CandidateError) {
    res.status(422).set(JSON_HEADERS).json({ error: "invalid_candidate", message: e.message, field: e.field ?? null });
  } else {
    const msg = (e as any)?.message ?? String(e);
    console.error("[internal]", msg);
    res.status(500).set(JSON_HEADERS).json({ error: "internal_error", message: msg });
  }
}

function workerId(req: Request): string {
  const w = req.body?.worker_id;
  if (typeof w !== "string" || !w.trim() || w.length > 80) throw new DraftError("worker_id is required", 400, "bad_worker_id");
  return w.trim();
}

router.use("/internal", express.json({ limit: "2mb" }), requireWorker);

// POST /internal/intake/claim {worker_id, draft_id?} -> {draft, job} | 204
router.post("/internal/intake/claim", (req, res) => {
  try {
    const db = getDb();
    const draftId = typeof req.body?.draft_id === "string" ? req.body.draft_id : undefined;
    const claimed = claimJob(db, workerId(req), draftId);
    if (!claimed) {
      if (draftId && getDraft(db, draftId)) {
        res.status(409).set(JSON_HEADERS).json({ error: "already_claimed_or_no_job", draft_id: draftId });
      } else {
        res.status(204).end();
      }
      return;
    }
    const { draft, job } = claimed;
    res.set(JSON_HEADERS).json({
      job,
      draft: {
        id: draft.id,
        source_url: draft.source_url,
        source_domain: draft.source_domain,
        subject_node_id: draft.subject_node_id,
        candidates: draft.candidates,
        messages: draft.messages,
        pages: draft.pages,
        summary: draft.summary,
        passes: draft.passes,
        contributor_id: draft.contributor_id,
        self_node_id: selfNode(draft.contributor_id),
        contributor_name: contributorName(draft.contributor_id),
      },
    });
  } catch (e) {
    sendError(res, e);
  }
});

function selfNode(contributorId: string): string | null {
  const row = getDb().prepare("SELECT self_node_id FROM contributor_emails WHERE contributor_id = ? AND self_node_id IS NOT NULL LIMIT 1").get(contributorId) as any;
  return row?.self_node_id ?? null;
}
function contributorName(contributorId: string): string {
  const row = getDb().prepare("SELECT name FROM contributors WHERE id = ?").get(contributorId) as any;
  return row?.name ?? "";
}

router.post("/internal/intake/drafts/:id/heartbeat", (req, res) => {
  try {
    const ok = heartbeat(getDb(), String(req.params.id), workerId(req));
    res.status(ok ? 200 : 409).set(JSON_HEADERS).json({ ok });
  } catch (e) {
    sendError(res, e);
  }
});

// POST /internal/intake/tool {name, input} — allowlisted read tools
router.post("/internal/intake/tool", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name : "";
  if (!isIntakeTool(name)) {
    res.status(400).set(JSON_HEADERS).json({ error: "unknown_tool", name });
    return;
  }
  try {
    const out = await runIntakeTool(getDb(), name, req.body?.input);
    res.set(JSON_HEADERS).json({ result: out });
  } catch (e) {
    sendError(res, e);
  }
});

// POST /internal/intake/drafts/:id/candidates {worker_id, tool, input}
router.post("/internal/intake/drafts/:id/candidates", (req, res) => {
  try {
    const tool = typeof req.body?.tool === "string" ? req.body.tool : "";
    if (!DRAFT_TOOL_NAMES.has(tool)) {
      res.status(400).set(JSON_HEADERS).json({ error: "unknown_draft_tool", tool });
      return;
    }
    const out = runDraftTool(getDb(), String(req.params.id), workerId(req), tool, req.body?.input);
    res.set(JSON_HEADERS).json({ result: out });
  } catch (e) {
    sendError(res, e);
  }
});

router.patch("/internal/intake/drafts/:id/candidates/:cid", (req, res) => {
  try {
    const out = runDraftTool(getDb(), String(req.params.id), workerId(req), "update_candidate", { cid: String(req.params.cid), patch: req.body?.patch });
    res.set(JSON_HEADERS).json({ result: out });
  } catch (e) {
    sendError(res, e);
  }
});

router.delete("/internal/intake/drafts/:id/candidates/:cid", (req, res) => {
  try {
    const out = runDraftTool(getDb(), String(req.params.id), workerId(req), "remove_candidate", { cid: String(req.params.cid) });
    res.set(JSON_HEADERS).json({ result: out });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/internal/intake/drafts/:id/pages", (req, res) => {
  try {
    res.set(JSON_HEADERS).json(workerAddPage(getDb(), String(req.params.id), workerId(req), req.body?.page ?? req.body));
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/internal/intake/drafts/:id/messages", (req, res) => {
  try {
    res.set(JSON_HEADERS).json(workerAddMessage(getDb(), String(req.params.id), workerId(req), req.body?.text));
  } catch (e) {
    sendError(res, e);
  }
});

// GET current draft state (the worker re-reads candidates between passes)
router.get("/internal/intake/drafts/:id", (req, res) => {
  try {
    const d = mustGetDraft(getDb(), String(req.params.id));
    res.set(JSON_HEADERS).json({ draft: { id: d.id, status: d.status, subject_node_id: d.subject_node_id, candidates: d.candidates, messages: d.messages, pages: d.pages, summary: d.summary } });
  } catch (e) {
    sendError(res, e);
  }
});

// POST /internal/intake/drafts/:id/finish {worker_id, summary, usage, error?}
router.post("/internal/intake/drafts/:id/finish", async (req, res) => {
  try {
    const db = getDb();
    const r = finishPass(db, String(req.params.id), workerId(req), {
      summary: req.body?.summary,
      usage: req.body?.usage,
      error: req.body?.error,
    });
    res.set(JSON_HEADERS).json(r);
    if (r.notify) {
      const draft = getDraft(db, String(req.params.id));
      const email = draft ? emailFor(db, draft.contributor_id) : null;
      if (draft && email) {
        markNotified(db, draft.id);
        if (r.notify === "ready") await sendDraftReadyEmail(db, email, draft);
        else await sendDraftFailedEmail(db, email, draft);
      }
    }
  } catch (e) {
    if (!res.headersSent) sendError(res, e);
    else console.error("[internal] post-finish notify failed:", (e as any)?.message ?? e);
  }
});

export default router;
