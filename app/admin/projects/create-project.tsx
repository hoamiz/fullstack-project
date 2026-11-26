"use client";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateProject() {
  const [error, setError] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const status = formData.get("status") as string;
    const project = {
      title,
      slug,
      description,
      status,
    };
    const response = await apiFetch("/admin/projects", {
      method: "POST",
      body: JSON.stringify(project),
    });
    if (response.ok) {
      setShowCreateProject(false);
      setError(null);
      router.replace("/admin/projects");
    } else {
      const error = await response.json();
      if (response.status === 409) {
        setError("Slug đã tồn tại");
      } else if (response.status === 400) {
        setError(error.error);
      } else if (response.status === 403) {
        setError("Bạn không có quyền tạo dự án");
      } else {
        setError("Đã xảy ra lỗi");
      }
    }
  };
  const handleCancel = () => {
    setShowCreateProject(false);
    setError(null);
  };
  return (
    <div className="flex flex-col gap-2 items-center">
      <div
        className="text-2xl font-bold cursor-pointer hover:text-blue-500 flex items-center justify-center relative z-10"
        onClick={() => setShowCreateProject(!showCreateProject)}
      >
        Thêm dự án mới
      </div>
      {showCreateProject && (
        <div
          className="flex flex-col 
        gap-2 items-center w-md mx-auto border 
        border-gray-200 rounded-md p-4 
        fixed top-1/2 left-1/2 
        transform -translate-x-1/2 -translate-y-1/2 
        bg-gray-500 text-white z-50"
        >
          <h1 className="text-2xl font-bold">Create Project</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              name="title"
              placeholder="Title"
              className="border border-gray-200 rounded-md p-2"
            />
            <label htmlFor="slug">Slug</label>
            <input
              type="text"
              name="slug"
              placeholder="Slug"
              className="border border-gray-200 rounded-md p-2"
            />
            <label htmlFor="description">Description</label>
            <textarea
              name="description"
              placeholder="Description"
              className="border border-gray-200 rounded-md p-2"
            />
            <label htmlFor="status">Status</label>
            <select
              name="status"
              className="border border-gray-200 rounded-md p-2"
            >
              <option
                value="draft"
                defaultValue="draft"
                className="border border-gray-200 rounded-md p-2"
              >
                Draft
              </option>
              <option
                value="published"
                className="border border-gray-200 rounded-md p-2"
              >
                Published
              </option>
            </select>
            <button
              type="submit"
              className="bg-blue-500 text-white rounded-md p-2"
            >
              Create
            </button>
          </form>
          {error && <p className="text-red-500">{error}</p>}
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
