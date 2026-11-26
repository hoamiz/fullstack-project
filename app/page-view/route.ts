import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { apiUrl } from "@/lib/projects";

export async function POST(request: Request) {
  const { path } = await request.json();
  const cookieStore = await cookies();
  let vid = cookieStore.get("vid")?.value;
  if (!vid) {
    vid = randomBytes(32).toString("hex");
    cookieStore.set("vid", vid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  let csrf = cookieStore.get("csrf")?.value;
  const sid = cookieStore.get("sid")?.value;

  if (!csrf) {
    const warm = await fetch(`${apiUrl}/projects`, { cache: "no-store" });
    const line = warm.headers
      .getSetCookie?.()
      .find((item) => item.startsWith("csrf="));
    csrf = line?.split(";")[0]?.slice("csrf=".length);
    if (csrf) {
      cookieStore.set("csrf", csrf, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }
  await fetch(`${apiUrl}/analytics/page-view`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: [
        `vid=${vid}`,
        csrf ? `csrf=${csrf}` : "",
        sid ? `sid=${sid}` : "",
      ]
        .filter(Boolean)
        .join("; "),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },

    body: JSON.stringify({ path }),
    cache: "no-store",
  });
  return new Response(null, { status: 204 });
}
