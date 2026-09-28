import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Portfolio của Lê</h1>
      <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Ghi chú ôn Next.js App Router. Danh sách project do server Next.js lấy
        từ API Node khi mở trang. Chưa có database.
      </p>
      <Link
        href="/projects"
        className="w-fit rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
      >
        Xem projects
      </Link>
    </main>
  );
}
