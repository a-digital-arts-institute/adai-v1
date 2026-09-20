// Spawner + reaper for ephemeral worker machines (docs/URL-INTAKE-SPEC.md
// §6.5). One Fly Machine per job in the `adai-intake-worker` app, created
// through the Machines API with auto_destroy. Locally (WORKER_IMAGE unset)
// spawn is a no-op and the worker runs by hand in poll mode.

import type { DatabaseSync } from "node:sqlite";
import { pendingJobs, setMachineId, type Draft } from "./draft.js";

const MACHINES_API = "https://api.machines.dev/v1";

function cfg() {
  return {
    image: process.env.WORKER_IMAGE || null,
    app: process.env.WORKER_APP || "adai-intake-worker",
    token: process.env.FLY_API_TOKEN || null,
    region: process.env.WORKER_REGION || "fra",
    maxMachines: parseInt(process.env.INTAKE_MAX_MACHINES || "3", 10) || 3,
    adaiUrl: process.env.WORKER_ADAI_URL || "http://adai-basel.flycast",
    model: process.env.INTAKE_MODEL || "claude-sonnet-5",
    hardTimeoutS: parseInt(process.env.INTAKE_HARD_TIMEOUT_S || "2700", 10) || 2700,
  };
}

export function isSpawnerConfigured(): boolean {
  const c = cfg();
  return !!(c.image && c.token);
}

interface Machine {
  id: string;
  name: string;
  state: string;
  created_at: string;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const c = cfg();
  const res = await fetch(`${MACHINES_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`machines api ${init.method ?? "GET"} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function listMachines(): Promise<Machine[]> {
  const c = cfg();
  return api<Machine[]>(`/apps/${c.app}/machines`);
}

const LIVE_STATES = new Set(["created", "starting", "started", "replacing", "stopping"]);

export async function spawn(db: DatabaseSync, draft: Draft): Promise<string | null> {
  const c = cfg();
  if (!c.image || !c.token) {
    console.log(`[intake-spawn] spawn skipped for ${draft.id} — run the worker locally (WORKER_IMAGE/FLY_API_TOKEN unset)`);
    return null;
  }
  const job = draft.job;
  if (!job) return null;
  const live = (await listMachines()).filter((m) => LIVE_STATES.has(m.state));
  if (live.length >= c.maxMachines) {
    console.log(`[intake-spawn] ${live.length} machines live (cap ${c.maxMachines}); ${draft.id} waits`);
    return null;
  }
  const ts = Date.now().toString(36);
  const body = {
    name: `intake-${draft.id}-${job.kind}-${ts}`.slice(0, 60),
    region: c.region,
    config: {
      image: c.image,
      auto_destroy: true,
      restart: { policy: "no" },
      guest: { cpu_kind: "shared", cpus: 1, memory_mb: 1024 },
      env: {
        DRAFT_ID: draft.id,
        JOB_KIND: job.kind,
        ADAI_URL: c.adaiUrl,
        INTAKE_MODEL: c.model,
        INTAKE_HARD_TIMEOUT_S: String(c.hardTimeoutS),
      },
    },
  };
  const m = await api<Machine>(`/apps/${c.app}/machines`, { method: "POST", body: JSON.stringify(body) });
  setMachineId(db, draft.id, m.id);
  console.log(`[intake-spawn] machine ${m.id} for ${draft.id} (${job.kind})`);
  return m.id;
}

/** Fire-and-forget wrapper for the request path. */
export function spawnAsync(db: DatabaseSync, draft: Draft): void {
  spawn(db, draft).catch((e) => console.error(`[intake-spawn] ${draft.id}: ${e?.message ?? e}`));
}

/** Interval body: retry queued jobs without a live machine; reap overstayers. */
export async function tick(db: DatabaseSync): Promise<void> {
  const c = cfg();
  if (!c.image || !c.token) return;
  let machines: Machine[];
  try {
    machines = await listMachines();
  } catch (e: any) {
    console.error(`[intake-spawn] list failed: ${e?.message ?? e}`);
    return;
  }
  const liveIds = new Set(machines.filter((m) => LIVE_STATES.has(m.state)).map((m) => m.id));
  const cutoff = Date.now() - (c.hardTimeoutS + 300) * 1000;
  for (const m of machines) {
    if (!LIVE_STATES.has(m.state)) continue;
    if (new Date(m.created_at).getTime() < cutoff) {
      try {
        await api(`/apps/${c.app}/machines/${m.id}?force=true`, { method: "DELETE" });
        console.log(`[intake-spawn] reaped overstaying machine ${m.id}`);
        liveIds.delete(m.id);
      } catch (e: any) {
        console.error(`[intake-spawn] reap ${m.id} failed: ${e?.message ?? e}`);
      }
    }
  }
  for (const d of pendingJobs(db)) {
    if (d.machine_id && liveIds.has(d.machine_id)) continue; // still booting / running
    try {
      await spawn(db, d);
    } catch (e: any) {
      console.error(`[intake-spawn] respawn ${d.id}: ${e?.message ?? e}`);
    }
  }
}

let timer: NodeJS.Timeout | null = null;
export function startSpawnerInterval(db: DatabaseSync, everyMs = 60_000): void {
  if (timer || !isSpawnerConfigured()) return;
  timer = setInterval(() => { tick(db).catch(() => {}); }, everyMs);
  timer.unref();
}
