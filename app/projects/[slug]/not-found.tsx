import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Không tìm thấy project
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Slug này không có trên API.
      </p>
      <Link href="/projects" className="w-fit text-sm font-medium underline">
        Về danh sách projects
      </Link>
    </main>
  );
}
