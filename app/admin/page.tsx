"use client";

import { apiFetch } from "@/lib/api";
import { Project } from "@/lib/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Analytics {
  total: number;
  byDay: { date: string; count: number }[];
  projects: Project[];
}

const AdminPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const router = useRouter();

  const resetAnalytics = async () => {
    try {
      const response = await apiFetch("/admin/analytics", {
        method: "POST",
      });
      if (response.status === 204) {
        const analyticsResponse = await apiFetch("/admin/analytics");
        if (analyticsResponse.status === 200) {
          const analyticsData = await analyticsResponse.json();
          setAnalytics(analyticsData);
        }
        setShowResetConfirm(false);
        return;
      } else {
        setError(response.statusText);
      }
    } catch {
      setError("Không thể đặt lại số liệu");
      setShowResetConfirm(false);
      return;
    }
  };

  useEffect(() => {
    const fetchMe = async () => {
      const response = await apiFetch("/auth/me");
      if (response.status === 401) {
        setError("Vui lòng đăng nhập");
        router.replace("/login");
        return;
      } else if (response.status === 403) {
        setError("Không đủ quyền");
        return;
      }
      if (!response.ok) {
        setError(response.statusText);
        router.replace("/");
        return;
      }
      const data = await response.json();
      if (data.role === "admin") {
        const analyticsResponse = await apiFetch("/admin/analytics");
        if (analyticsResponse.status === 200) {
          const analyticsData = await analyticsResponse.json();
          setAnalytics(analyticsData);
          console.log(analyticsData);
        }
        return;
      }
      setError("Không đủ quyền");
      return;
    };
    fetchMe();
    return () => {
      setAnalytics(null);
      setError(null);
      setShowResetConfirm(false);
    };
  }, [router]);
  return (
    <div>
      {error && (
        <div className="text-red-500">
          {error}
          {error === "Không đủ quyền" && (
            <Link href="/" className="text-blue-500">
              Về trang chủ
            </Link>
          )}
        </div>
      )}
      {analytics && (
        <div className="max-w-2xl mx-auto">
          {analytics.byDay.length > 0 && (
            <div className="flex flex-row gap-2 justify-between items-center">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Lượt truy cập</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byDay.map(
                    (day: { date: string; count: number }) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{day.count}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-center">
            Tổng lượt truy cập: {analytics.total}
          </div>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md mx-auto block pointer-events-auto"
            onClick={() => setShowResetConfirm(true)}
          >
            Đặt lại số liệu
          </button>
          {showResetConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
              <div className="bg-white p-4 rounded-md max-w-md mx-auto">
                <p className="text-center text-black">
                  Số trên dashboard về 0. Các dòng page_views cũ vẫn còn trong
                  database.
                </p>
                <div className="flex flex-row gap-2 justify-center mt-4">
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded-md mx-auto block pointer-events-auto"
                    onClick={resetAnalytics}
                  >
                    Xác nhận đặt lại
                  </button>
                  <button
                    className="bg-red-500 text-white px-4 py-2 rounded-md mx-auto block pointer-events-auto"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}
          {analytics.projects.map((project: Project) => (
            <div
              key={project.slug}
              className="flex flex-row gap-2 w-md mx-auto justify-between items-center h-12 border-b border-gray-200"
            >
              <h2 className="text-xl font-bold">{project.title}</h2>
              <p className="text-sm text-gray-500">{project.slug}</p>
              <p className="text-sm text-gray-500">{project.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
