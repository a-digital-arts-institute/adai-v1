import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initDb, getDb } from "./db.js";
import { slugify } from "./utils/slug.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const dbPath = process.env.DB_PATH || "adai.db";

console.log("Initializing database:", dbPath);
initDb(dbPath);
const db = getDb();

// create migration signal
db.prepare(
  "INSERT OR IGNORE INTO signals (id, title, source_url, source_type, cla_layer, summary, content, submitted_by, confidence, lived_experience, source_origin, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(
  "signal-migration",
  "Initial seed migration",
  null,
  "migration",
  null,
  "Bulk import from research JSON files in ./results/",
  null,
  "migration",
  "low",
  0,
  "human_secondary",
  "seed-migration-2026-04-20"
);
console.log("Migration signal created.");

// create migration contributor
db.prepare(
  "INSERT OR IGNORE INTO contributors (id, name, type, trust_tier, contributions, approved_count) VALUES (?, ?, ?, ?, ?, ?)"
).run("contributor-migration", "migration", "script", "auto", 0, 0);
console.log("Migration contributor created.");

// process JSON files
const resultsDir = join(PROJECT_ROOT, "results");
const files = readdirSync(resultsDir).filter((f) => f.endsWith(".json"));
console.log(`Scanning ./results/ for JSON files... found ${files.length}`);

const insertNode = db.prepare(
  "INSERT OR IGNORE INTO nodes (id, type, name, slug, metadata, updated_by) VALUES (?, ?, ?, ?, ?, ?)"
);
const insertEdge = db.prepare(
  "INSERT OR IGNORE INTO edges (id, source_id, target_id, edge_type, signal_id, confidence, charge, created_by, event_time, valid_until, invalidated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

for (const file of files) {
  const filePath = join(resultsDir, file);
  console.log(`Processing ${filePath}`);

  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  const basicInfo = data.basic_info;
  const entityName: string = basicInfo.name;
  const entityType: string = basicInfo.type;
  const slug = slugify(entityName);
  const nodeId = `${entityType}-${slug}`;
  const metadataJson = JSON.stringify(data);

  // insert practitioner node
  insertNode.run(nodeId, entityType, entityName, slug, metadataJson, "migration");

  // extract medium concepts -> PRACTICES edges
  const medium = data.practice_description?.medium;
  if (typeof medium === "string") {
    for (const raw of medium.split(",")) {
      const conceptName = raw.trim();
      if (!conceptName) continue;
      const conceptSlug = slugify(conceptName);
      const conceptId = `concept-${conceptSlug}`;
      insertNode.run(conceptId, "concept", conceptName, conceptSlug, null, "migration");
      const edgeId = `${nodeId}-practices-${conceptId}`;
      insertEdge.run(edgeId, nodeId, conceptId, "PRACTICES", "signal-migration", "low", null, "migration", null, null, null);
    }
  }

  // extract connections -> RELATED_TO edges
  const connections = data.network_position?.connections;
  if (typeof connections === "string") {
    for (const raw of connections.split(",")) {
      const connectionName = raw.trim();
      if (!connectionName) continue;
      // strip parenthetical descriptions
      const cleanName = connectionName.split("(")[0].trim();
      const connSlug = slugify(cleanName);
      const connId = `related-${connSlug}`;
      insertNode.run(connId, "related", cleanName, connSlug, null, "migration");
      const edgeId = `${nodeId}-related-to-${connId}`;
      insertEdge.run(edgeId, nodeId, connId, "RELATED_TO", "signal-migration", "low", null, "migration", null, null, null);
    }
  }

  // extract scene affiliation -> BELONGS_TO edges
  const sceneAffiliation = data.network_position?.scene_affiliation;
  if (typeof sceneAffiliation === "string") {
    for (const raw of sceneAffiliation.split(",")) {
      const sceneName = raw.trim();
      if (!sceneName) continue;
      const cleanScene = sceneName.split("(")[0].trim();
      const sceneSlug = slugify(cleanScene);
      const sceneId = `scene-${sceneSlug}`;
      insertNode.run(sceneId, "scene", cleanScene, sceneSlug, null, "migration");
      const edgeId = `${nodeId}-belongs-to-${sceneId}`;
      insertEdge.run(edgeId, nodeId, sceneId, "BELONGS_TO", "signal-migration", "low", null, "migration", null, null, null);
    }
  }
}

// report stats
const { count: totalNodes } = db.prepare("SELECT COUNT(*) as count FROM nodes").get() as any;
const { count: totalEdges } = db.prepare("SELECT COUNT(*) as count FROM edges").get() as any;
console.log(`Total nodes: ${totalNodes}`);
console.log(`Total edges: ${totalEdges}`);

const nodesByType = db.prepare("SELECT type, COUNT(*) as count FROM nodes GROUP BY type").all() as any[];
console.log("Nodes by type:", nodesByType);

const edgesByType = db.prepare("SELECT edge_type, COUNT(*) as count FROM edges GROUP BY edge_type").all() as any[];
console.log("Edges by type:", edgesByType);

console.log("Seed complete!");
