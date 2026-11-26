"use client";

import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import z from "zod";

const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Tên không được để trống"),
    email: z.string().trim().email("Email không hợp lệ").toLowerCase(),
    password: z
      .string()
      .min(12, "Mật khẩu phải có ít nhất 12 ký tự")
      .regex(
        /[A-Za-z]/,
        "Mật khẩu phải có ít nhất 1 chữ cái viết hoa và 1 chữ cái viết thường",
      )
      .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 số"),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) =>
      data.confirmPassword === undefined ||
      data.password === data.confirmPassword,
    {
      message: "Mật khẩu và xác nhận mật khẩu không khớp",
      path: ["confirmPassword"],
    },
  );
type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupForm() {
  const [formData, setFormData] = useState<SignupFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const safeParse = signupSchema.safeParse({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });

    if (!safeParse.success) {
      const errorParsed = JSON.parse(safeParse.error.message);
      const errorMessage = errorParsed.map(
        (error: { message: string }) => error.message,
      );
      console.log("zod error", errorMessage);
      setErrorMessage(errorMessage);
      return;
    }
    setErrorMessage([]);
    try {
      setIsSubmitting(true);
      const response = await apiFetch(`/auth/register`, {
        method: "POST",
        body: JSON.stringify(safeParse.data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error(errorData);
        setErrorMessage([errorData.error]);
        setIsSubmitting(false);
        return;
      }
      const data = await response.json();
      console.log(data);
      setIsSubmitting(false);
      router.replace("/login");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
        setErrorMessage([error.message]);
        setIsSubmitting(false);
      } else {
        setErrorMessage(["Lỗi khi đăng ký"]);
        setIsSubmitting(false);
      }
      return;
    }
  };
  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-white">
          Tên
        </label>
        <input
          className="bg-zinc-800 text-white p-2 rounded-md"
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-white">
          Email:
        </label>
        <input
          className="bg-zinc-800 text-white p-2 rounded-md"
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-white">
          Mật khẩu:
        </label>
        <input
          className="bg-zinc-800 text-white p-2 rounded-md"
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className="text-white">
          Xác nhận mật khẩu:
        </label>
        <input
          className="bg-zinc-800 text-white p-2 rounded-md"
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
        />
      </div>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
      </button>
      {errorMessage.length > 0 ? (
        <div className="text-red-500 text-md" role="status" aria-live="polite">
          {errorMessage.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
      <Link
        href="/login"
        className="text-white text-md underline hover:text-gray-300"
      >
        Đăng nhập
      </Link>
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
  );
}
