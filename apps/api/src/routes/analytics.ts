import { Router } from "express";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { createPageView } from "../analytics.js";
import { findProjectBySlug } from "../projects.js";
import { User } from "../users.js";
import { pool } from "../db.js";
import rateLimit from "express-rate-limit";

export const analyticsRouter = Router();
const pageViewSchema = z.object({
  path: z.string().min(1).max(200),
});
const pageViewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "Bạn thử ghi view page quá nhiều lần. Đợi một lát rồi thử lại.",
    });
  },
});
analyticsRouter.post("/page-view", pageViewLimiter, async (req, res) => {
  const result = pageViewSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const header = req.get("User-Agent")?.toLowerCase() || "";
  if (!header) {
    res.status(204).end();
    return;
  }
  if (
    header.includes("bot") ||
    header.includes("crawler") ||
    header.includes("spider")
  ) {
    res.status(204).end();
    return;
  }
  const path = result.data.path;
  const view_date = new Date().toISOString().slice(0, 10);
  let rawKey = "";

  if (req.session.userId) {
    const roleResult = await pool.query<User>(
      `SELECT role FROM users WHERE id = $1`,
      [req.session.userId],
    );
    if (roleResult.rows[0]?.role === "admin") {
      res.status(204).end();
      return;
    }
    rawKey = req.sessionID;
  } else {
    const vid = req.cookies.vid;
    if (vid) {
      rawKey = vid;
    } else {
      rawKey = randomBytes(32).toString("hex");
      res.cookie("vid", rawKey, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }
  const viewer_key = createHash("sha256").update(rawKey).digest("hex");

  if (path === "/" || path === "/projects") {
    await createPageView(path, viewer_key, view_date);
    res.status(204).end();
    return;
  } else if (path.startsWith("/projects/")) {
    const params = path.split("/");
    const project = await findProjectBySlug(params[2]);
    if (!project) {
      res.status(204).end();
      return;
    }
    await createPageView(path, viewer_key, view_date);
    res.status(204).end();
  } else {
    res.status(400).json({ error: "Path không được ghi" });
    return;
  }
});
