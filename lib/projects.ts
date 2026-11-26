export type Project = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  stack: string[];
  year: number;
  status: "draft" | "published";
};

export const apiUrl = process.env.API_URL ?? "http://localhost:4000";

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${apiUrl}/projects`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Không tải được danh sách project: ${response.status}`);
  }

  return response.json();
}

export async function getProject(slug: string): Promise<Project | undefined> {
  const response = await fetch(
    `${apiUrl}/projects/${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Không tải được project: ${response.status}`);
  }

  return response.json();
}
