"use client";

export default function ProjectsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Không tải được projects
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        API không phản hồi. Thử lại sau khi server API đang chạy.
      </p>
      {error.digest ? (
        <p className="font-mono text-sm text-zinc-500">{error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => retry()}
        className="w-fit rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
      >
        Thử lại
      </button>
    </main>
  );
}
