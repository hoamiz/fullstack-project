"use client";
import { useEffect } from "react";
export function RecordPageView({ path }: { path: string }) {
  useEffect(() => {
    fetch("/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  }, [path]);
  return null;
}
