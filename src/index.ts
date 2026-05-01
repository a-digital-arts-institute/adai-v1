import express from "express";
import { initDb } from "./db.js";
import pageRoutes from "./routes/pages.js";
import apiRoutes from "./routes/api.js";
import { htmlPage, HTML_HEADERS } from "./templates.js";

const dbPath = process.env.DB_PATH || "adai.db";
const port = parseInt(process.env.PORT || "8080", 10);

console.log("Setting database path:", dbPath);
initDb(dbPath);
console.log("Database initialized.");

const app = express();
app.use(express.json());

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
