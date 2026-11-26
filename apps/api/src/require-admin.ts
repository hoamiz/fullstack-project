import type { NextFunction, Request, Response } from "express";
import { pool } from "./db.js";
import { User } from "./users.js";
import { Project } from "./projects.js";

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ error: "Chưa đăng nhập" });
    return;
  }
  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<User | undefined> {
  const result = await pool.query<User>(
    `SELECT role FROM users WHERE id = $1`,
    [req.session.userId],
  );

  if (!result.rows[0] || result.rows[0].role !== "admin") {
    res.status(403).json({ error: "Không đủ quyền" });
    return;
  }
  next();
}

export async function getAdminProject(
): Promise<Project[] | undefined> {
  const result = await pool.query<Project>(`
    SELECT slug, title, summary, description, stack, year, status
    FROM projects
    ORDER BY id`);
  return result.rows;
}
