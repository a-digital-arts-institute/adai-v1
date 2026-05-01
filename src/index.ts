import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initDb } from "./db.js";
import pageRoutes from "./routes/pages.js";
import apiRoutes from "./routes/api.js";
import { htmlPage, HTML_HEADERS } from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH || "adai.db";
const port = parseInt(process.env.PORT || "8080", 10);

console.log("Setting database path:", dbPath);
initDb(dbPath);
console.log("Database initialized.");

const app = express();
app.use(express.json());

// /field-static serves the public/field tree (p5-derived data-driven graph view).
// Mounted before route handlers so /field-static/* never reaches the page router.
app.use("/field-static", express.static(path.join(__dirname, "..", "public", "field")));

// mount routes
app.use(pageRoutes);
app.use(apiRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).set(HTML_HEADERS).send(htmlPage("Not Found", "<h2>404</h2><p>Page not found.</p>"));
});

app.listen(port, () => {
  console.log(`A(DAI) server starting on port ${port}`);
});
