"use client";

import { apiFetch } from "@/lib/api";
import { Project } from "@/lib/projects";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CreateProject from "./create-project";

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin" | null>(null);

  const router = useRouter();

  const handlePublish = async (slug: string, status: "draft" | "published") => {
    const response = await apiFetch(`/admin/projects/${slug}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: status,
      }),
    });

    if (!response.ok) {
      setError(response.statusText);
    } else {
      const project = await response.json();
      const newProjects = projects.map((p) => {
        if (p.slug === slug) {
          return project;
        }
        return p;
      });
      setProjects(newProjects);
      fetchMe();
    }
  };
  const fetchMe = async () => {
    const response = await apiFetch("/admin/projects");
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (response.status === 403) {
      setError("Không đủ quyền");
      return;
    }
    if (!response.ok) {
      router.replace("/login");
      return;
    }
    const data = await response.json();
    setProjects(data.projects);
    setRole("admin");
  };

  useEffect(() => {
    fetchMe();
  });

  return (
    <div>
      {role === "admin" && <CreateProject />}
      {projects.map((project: Project) => (
        <div
          key={project.slug}
          className="flex flex-row gap-2 w-md mx-auto justify-between items-center h-12 border-b border-gray-200"
        >
          <h2 className="text-2xl font-bold">{project.title}</h2>
          <p className="text-sm text-gray-500">{project.slug}</p>
          <p className="text-sm text-gray-500">{project.status}</p>
          <button
            onClick={() =>
              handlePublish(
                project.slug,
                project.status === "draft" ? "published" : "draft",
              )
            }
          >
            {project.status === "draft" ? "Xuất bản" : "Ẩn"}
          </button>
        </div>
      ))}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default ProjectsPage;
