import { Router } from "express";
import {
  getAdminProject,
  requireAdmin,
  requireUser,
} from "../require-admin.js";
import { z } from "zod";
import { createProject, Project, updateProject } from "../projects.js";
import {
  getLatestAnalyticsPeriod,
  getTotalPageViews,
  getPageViewsByDay,
  getAllProjects,
  resetAnalyticsPeriod,
} from "../analytics.js";

const projectSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(5000),
    status: z.enum(["draft", "published"]).default("draft"),
  })
  .strict();
const statusSchema = z
  .object({
    status: z.enum(["draft", "published"]),
  })
  .strict();
export const adminRouter = Router();

adminRouter.get("/whoami", requireUser, requireAdmin, (_req, res) => {
  res.status(204).end();
});

adminRouter.post("/projects", requireUser, requireAdmin, async (req, res) => {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { slug, title, description, status } = result.data;
  const summary =
    description.length > 160 ? description.substring(0, 160) : description;
  const stack: string[] = [];
  const year = new Date().getUTCFullYear();
  //form chưa gửi fileds này, API tự điền
  const { success, data, statusCode, message } = await createProject({
    slug,
    title,
    summary,
    description,
    stack,
    year,
    status,
  });
  if (!success) {
    res.status(statusCode).json({ error: message });
    return;
  }
  res.status(201).json({
    slug: data?.slug,
    title: data?.title,
    status: data?.status,
  });
});

adminRouter.patch(
  "/projects/:slug",
  requireUser,
  requireAdmin,
  async (req, res) => {
    const result = statusSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const { status } = result.data;

    const project = await updateProject(req.params.slug as string, status);
    if (!project) {
      res.status(404).json({ error: "Không tìm thấy project" });
      return;
    }
    res.status(200).json({
      slug: project.slug,
      status: project.status,
    });
  },
);

adminRouter.get("/projects", requireUser, requireAdmin, async (req, res) => {
  const projects: Project[] | undefined = await getAdminProject();
  if (!projects || projects.length === 0) {
    res.status(404).json({ error: "Không tìm thấy dự án" });
    return;
  }
  res.status(200).json({
    role: "admin",
    projects: projects.map((project) => ({
      slug: project.slug,
      title: project.title,
      status: project.status,
    })),
  });
});

adminRouter.get(
  "/analytics",
  requireUser,
  requireAdmin,
  async (req, res, next) => {
    try {
      const started_at = await getLatestAnalyticsPeriod();

      const total = await getTotalPageViews(started_at);
      const byDay = await getPageViewsByDay(started_at);
      const projects = await getAllProjects();
      const analytics = {
        total,
        byDay,
        projects,
      };
      res.status(200).json(analytics);
      return;
    } catch (error) {
      next(error);
      return;
    }
  },
);

adminRouter.post(
  "/analytics",
  requireUser,
  requireAdmin,
  async (req, res, next) => {
    try {
      const actor_user_id = req.session.userId;
      if (!actor_user_id) {
        res.status(401).json({ error: "Không được phép" });
        return;
      }
      await resetAnalyticsPeriod(actor_user_id as string);
      res.status(204).end();
      return;
    } catch (error) {
      next(error);
      return;
    }
  },
);
