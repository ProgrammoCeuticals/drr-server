import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import drrRouter from "./drr/router.js";
import adminRoutes from "./samples/routes/adminRoutes.js";
import templateRoutes from "./samples/routes/templateRoutes.js";
import submissionRoutes from "./samples/routes/submissionRoutes.js";
import { initializeApplicationData } from "./samples/config/bootstrap.js";

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
// Each client origin is allowed; the wildcard fallback covers public routes
// (samples templates/submissions are public-read).
const drrOrigins = new Set(
  (process.env.DRR_CLIENT_ORIGIN || "http://localhost:4200")
    .split(",")
    .map((s) => s.trim())
    .concat(["http://localhost:4200", "http://localhost:5173"])
);

const samplesOrigins = new Set(
  (process.env.SAMPLES_CLIENT_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .concat(["http://localhost:3000", "http://localhost:5173"])
);

const allOrigins = new Set([...drrOrigins, ...samplesOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// ── Root / Health ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ ok: true, message: "Shared server is live", services: ["drr", "samples"] }));
app.get("/health", (_req, res) => res.json({ ok: true, services: ["drr", "samples"] }));

// ── DRR routes (/api/*) ───────────────────────────────────────────────────────
app.use("/api", drrRouter);

// ── Samples bootstrap middleware ──────────────────────────────────────────────
app.use("/samples/api", async (req, res, next) => {
  if (req.path === "/health") return next();
  try {
    await initializeApplicationData();
    next();
  } catch (err) {
    next(err);
  }
});

// ── Samples routes (/samples/api/*) ──────────────────────────────────────────
app.get("/samples/api/health", (_req, res) => res.json({ ok: true, service: "samples" }));
app.use("/samples/api/admin", adminRoutes);
app.use("/samples/api/templates", templateRoutes);
app.use("/samples/api/submissions", submissionRoutes);

// ── DRR error handler ─────────────────────────────────────────────────────────
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Unexpected server error";
  if (message.includes("duplicate key")) return res.status(409).json({ message: "A record with that unique value already exists" });
  if (message.includes("Origin not allowed")) return res.status(403).json({ message });
  const status =
    message.includes("required") || message.includes("must be") || message.includes("before") ||
    message.includes("assigned") || message.includes("not found") ? 400 : 500;
  res.status(status).json({ message });
});

export default app;
