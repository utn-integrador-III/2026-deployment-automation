// Minimal demo API. Intentionally tiny — the point is the deployment, not the code.
const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;

// Allow the frontend (a different Fly app / different origin) to call this API.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Liveness probe — Fly uses this to know the machine is healthy.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// The one "real" endpoint.
app.get("/api/hello", (_req, res) => {
  res.json({
    message: "Hello from the backend running on Fly.io 🎈",
    region: process.env.FLY_REGION || "local",
    time: new Date().toISOString(),
  });
});

// Bind to 0.0.0.0 so the container accepts external traffic (not just localhost).
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});
