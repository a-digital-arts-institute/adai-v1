/**
 * Vercel Serverless Function — Notion API proxy.
 * Forwards POST requests to https://api.notion.com/v1/pages
 * with the caller's own Notion token (passed in Authorization header).
 * Exists solely to bypass Notion's lack of browser CORS support.
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Notion-Version");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const notionToken = req.headers.authorization;
  const notionVersion = req.headers["notion-version"] || "2022-06-28";

  if (!notionToken) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": notionToken,
        "Notion-Version": notionVersion,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
