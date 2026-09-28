import { pool } from "./db.js";

export type Project = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  stack: string[];
  year: number;
};

export async function listProjects(): Promise<Project[]> {
  const result = await pool.query<Project>(
    "SELECT slug, title, summary, description, stack, year FROM projects ORDER BY id",
  );
  return result.rows;
}

export async function findProjectBySlug(
  slug: string,
): Promise<Project | undefined> {
  const result = await pool.query<Project>(
    "SELECT slug, title, summary, description, stack, year FROM projects WHERE slug = $1",
    [slug],
  );
  return result.rows[0];
}
