import SignupForm from "./signup-form"


export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-start h-screen bg-zinc-900">
      <h1 className="text-4xl font-bold text-white">Đăng ký</h1>
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </div>
  )
}