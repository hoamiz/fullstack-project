import { pool } from "./db.js";
export type Project = {
  status: "draft" | "published";
  slug: string;
  title: string;
  summary: string;
  description: string;
  stack: string[];
  year: number;
};

export async function listProjects(): Promise<Project[]> {
  const result = await pool.query<Project>(
    `SELECT slug, title, summary, description, stack, year
     FROM projects
     WHERE status = 'published'
     ORDER BY id`,
  );
  return result.rows;
}

export async function findProjectBySlug(
  slug: string,
): Promise<Project | undefined> {
  const result = await pool.query<Project>(
    `SELECT slug, title, summary, description, stack, year
     FROM projects
     WHERE slug = $1 AND status = 'published'`,
    [slug],
  );
  return result.rows[0];
}

export async function updateProject(
  slug: string,
  status: "draft" | "published",
): Promise<Project | undefined> {
  const result = await pool.query<Project>(
    `UPDATE projects
    SET status = $2
    WHERE slug = $1
    RETURNING slug, status`,
    [slug, status],
  );
  if (!result.rows[0]) {
    return undefined;
  }
  return result.rows[0];
}

export const createProject = async (
  project: Project,
): Promise<{
  success: boolean;
  data: Project | undefined;
  statusCode: number;
  message: string;
}> => {
  const { slug, title, summary, description, stack, year, status } = project;
  try {
    const result = await pool.query<Project>(
      `
    INSERT INTO projects (slug, title, summary, description, stack, year, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING slug, title, status
    `,
      [slug, title, summary, description, stack, year, status],
    );
    if (!result.rows[0]) {
      return {
        success: false,
        data: undefined,
        statusCode: 500,
        message: "Lỗi khi thêm dự án",
      };
    }
    return {
      success: true,
      data: result.rows[0] as Project,
      statusCode: 201,
      message: "Dự án đã được thêm thành công",
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return {
        success: false,
        data: undefined,
        statusCode: 409,
        message: "Slug đã tồn tại",
      };
    }
    return {
      success: false,
      data: undefined,
      statusCode: 500,
      message: "Lỗi khi thêm dự án",
    };
  }
};
