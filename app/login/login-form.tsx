"use client";
import { apiFetch } from "@/lib/api";
import { apiUrl } from "@/lib/projects";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import z from "zod";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});
type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [providers, setProviders] = useState<{ google: boolean }>({
    google: false,
  });
  useEffect(() => {
    const fetchProviders = async () => {
      const response = await apiFetch("/auth/providers");
      const data = await response.json();
      setProviders(data);
    };
    fetchProviders();
  }, []);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      setErrorMessage("Email hoặc mật khẩu không hợp lệ");
      return;
    }
    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 401) {
        setErrorMessage(errorData.error);
        return;
      } else {
        setErrorMessage(errorData.error);
        return;
      }
    } else {
      if (response.status === 200) {
        router.replace("/account");
      } else {
        setErrorMessage("Đăng nhập thất bại");
      }
    }
  };

  const searchParams = useSearchParams();
  const code = searchParams.get("error") || null;
  const googleError =
    code === "google_failed"
      ? "Đăng nhập Google không thành công"
      : code === "google_cancelled"
        ? "Bạn đã hủy đăng nhập Google"
        : code;

  return (
    <div className="flex flex-col gap-2">
      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-white">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="text-black p-2 rounded-md bg-gray-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-white">
            Mật khẩu
          </label>
          <input
            className="text-black p-2 rounded-md bg-gray-200"
            type="password"
            id="password"
            name="password"
            placeholder="Mật khẩu"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        {errorMessage.length > 0 ? (
          <div
            className="text-red-500 text-md"
            role="status"
            aria-live="polite"
          >
            <p>{errorMessage}</p>
          </div>
        ) : null}
        {googleError && <div className="text-red-500">{googleError}</div>}
        <button type="submit" className="bg-blue-500 text-white p-2 rounded-md">
          Đăng nhập
        </button>
        <Link
          href="/signup"
          className="text-white text-md underline hover:text-gray-300"
        >
          Đăng ký
        </Link>
        {providers.google ? (
          <Link
            href={`${apiUrl}/auth/google`}
            className="text-white text-md underline hover:text-gray-300"
          >
            Đăng nhập với Google
          </Link>
        ) : null}
        <Link
          href="/"
          className="text-white text-md underline hover:text-gray-300"
        >
          Tiếp tục với tư cách khách
        </Link>
        <p className="text-yellow-500/80 italic text-md">
          Nút này không đăng xuất. Đang đăng nhập thì hãy bấm Đăng xuất trước.
        </p>
      </form>
    </div>
  );
}
