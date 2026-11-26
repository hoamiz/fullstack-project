"use client";

import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const AccountPage = () => {
  const [user, setUser] = useState({
    email: "",
    name: "",
    role: "",
  });
  const router = useRouter();
  useEffect(() => {
    apiFetch("/auth/me").then(async (response) => {
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setUser({
          email: data.email,
          name: data.name,
          role: data.role,
        });
      }
    });
  }, [router]);
  const logout = async () => {
    const response = await apiFetch("/auth/logout", { method: "POST" });
    if (response.status === 204) {
      router.replace("/login");
    } else {
      console.error("Failed to logout");
    }
  };
  return (
    <div className="flex flex-col items-center justify-start h-screen bg-zinc-900">
      <h1 className="text-4xl font-bold text-white">Account</h1>
      <p className="text-white text-md">{user.email}</p>
      <p className="text-white text-md">{user.name}</p>
      <p className="text-white text-md">{user.role}</p>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
};
export default AccountPage;
