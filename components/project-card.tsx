import Link from "next/link";
import type { Project } from "@/lib/projects";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="block rounded-2xl border border-black/10 p-5 transition-colors hover:bg-black/4 dark:border-white/15 dark:hover:bg-white/6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-medium">{project.title}</h2>
        <span className="font-mono text-sm text-zinc-500">{project.year}</span>
      </div>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">{project.summary}</p>
      <p className="mt-3 font-mono text-sm text-zinc-500">
        /projects/{project.slug}
      </p>
    </Link>
  );
}
