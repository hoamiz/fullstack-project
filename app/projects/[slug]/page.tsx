import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/projects";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    return { title: "Không tìm thấy project" };
  }

  return {
    title: project.title,
    description: project.summary,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <Link
        href="/projects"
        className="text-sm text-zinc-500 hover:text-foreground"
      >
        ← Projects
      </Link>
      <p className="font-mono text-sm text-zinc-500">{project.year}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
      <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {project.description}
      </p>
      <ul className="flex flex-wrap gap-2">
        {project.stack.map((item) => (
          <li
            key={item}
            className="rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/15"
          >
            {item}
          </li>
        ))}
      </ul>
    </main>
  );
}
