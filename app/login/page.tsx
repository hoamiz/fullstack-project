import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-start h-screen bg-zinc-900">
      <h1 className="text-4xl font-bold text-white">Đăng nhập</h1>
      <div className="w-full max-w-md">
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
