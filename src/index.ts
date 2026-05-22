import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { initDb } from "./db.js";
import pageRoutes from "./routes/pages.js";
import apiRoutes from "./routes/api.js";
import contributorApiRoutes from "./routes/contributor-api.js";
import archivistRoutes from "./routes/archivist.js";
import { htmlPage, HTML_HEADERS } from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env into process.env when present. Node ≥20.6 ships
// `process.loadEnvFile()` natively. On Fly, R2_* and friends come from
// `flyctl secrets`, so no .env is needed and the missing-file path below
// is the expected one. We do this BEFORE anything else so the R2 client
// (and the DB_PATH override) see the values.
const envFile = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
    console.log("[env] loaded .env");
  } catch (e: any) {
    console.warn("[env] failed to load .env:", e?.message ?? e);
  }
}

const dbPath = process.env.DB_PATH || "adai.db";
const port = parseInt(process.env.PORT || "8080", 10);

console.log("Setting database path:", dbPath);
initDb(dbPath);
console.log("Database initialized.");

const app = express();
// 12 MB matches the multer cap on /api/v1/images and gives base64 payloads
// (4/3 size of the raw bytes) plus a small envelope room.
app.use(express.json({ limit: "16mb" }));

// /field-static serves the public/field tree (p5-derived data-driven graph view).
// Mounted before route handlers so /field-static/* never reaches the page router.
app.use("/field-static", express.static(path.join(__dirname, "..", "public", "field")));

// mount routes
app.use(pageRoutes);
app.use(apiRoutes);
app.use(contributorApiRoutes);
app.use(archivistRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).set(HTML_HEADERS).send(htmlPage("Not Found", "<h2>404</h2><p>Page not found.</p>"));
});

app.listen(port, () => {
  console.log(`A(DAI) server starting on port ${port}`);
});
