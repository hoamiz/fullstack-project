import { apiUrl } from "./projects";

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const row = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  if (!row) {
    return undefined;
  }
  return decodeURIComponent(row.slice(name.length + 1));
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const unsafe = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (unsafe) {
    const csrf = readCookie("csrf");
    if (csrf) {
      headers.set("X-CSRF-Token", csrf);
    }
  }
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}
