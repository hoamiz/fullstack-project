import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectCard } from "@/components/project-card";
import { getProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Ba project mẫu lấy từ API Node.",
};

async function ProjectList() {
  const projects = await getProjects();

  return (
    <ul className="flex flex-col gap-4">
        {projects.map((project) => (
        <li key={project.slug}>
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  );
}

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Danh sách lấy từ API. Bấm một card để mở trang chi tiết theo slug.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-zinc-600 dark:text-zinc-400">Đang tải projects...</p>
        }
      >
        <ProjectList />
      </Suspense>
    </main>
  );
}
