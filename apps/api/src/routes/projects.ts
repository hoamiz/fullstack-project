import { Router } from "express";
import { findProjectBySlug, listProjects } from "../projects.js";

export const projectsRouter = Router();

projectsRouter.get("/", async (_req, res) => {
  res.json(await listProjects());
});

projectsRouter.get("/:slug", async (req, res) => {
  const slug = req.params.slug;

  if (typeof slug !== "string") {
    res.status(404).json({ error: "Không tìm thấy project" });
    return;
  }

  const project = await findProjectBySlug(slug);

  if (!project) {
    res.status(404).json({ error: "Không tìm thấy project" });
    return;
  }

  res.json(project);
});
