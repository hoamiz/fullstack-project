import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lê — Portfolio",
    template: "%s · Lê",
  },
  description: "Portfolio frontend để ôn Next.js App Router.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-black/10 dark:border-white/15">
          <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-medium">
              Lê
            </Link>
            <Link
              href="/projects"
              className="text-sm text-zinc-600 dark:text-zinc-400"
            >
              Projects
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
