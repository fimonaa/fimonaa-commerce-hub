import { useState, type SubmitEvent } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";

export default function LoginPage() {
  const { login, status, error } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isLoading = status === "authenticating";

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  if (status === "selecting") {
    return <Navigate to="/select-business" replace />;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    try {
      await login(email.trim(), password);
    } catch {
      // Authentication errors are handled by AuthProvider.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf7f5] px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-9 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8e7ee] text-2xl font-semibold text-[#a92f62]">
            F
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#292326]">
            Fimonaa
          </h1>

          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#a92f62]">
            Commerce Hub
          </p>
        </div>

        <div className="rounded-3xl border border-[#eee5e4] bg-white p-7 shadow-[0_20px_60px_rgba(65,39,48,0.06)] sm:p-9">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#887c7f]">
              Sign in to manage your business workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#594d51]"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#e9dfe1] bg-white px-4 py-3 text-sm text-[#292326] outline-none transition placeholder:text-[#b0a5a7] focus:border-[#a92f62] focus:ring-2 focus:ring-[#f8e7ee] disabled:opacity-60"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[#594d51]"
                >
                  Password
                </label>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-[#e9dfe1] bg-white px-4 py-3 pr-20 text-sm text-[#292326] outline-none transition placeholder:text-[#b0a5a7] focus:border-[#a92f62] focus:ring-2 focus:ring-[#f8e7ee] disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-3 px-2 text-xs font-semibold text-[#a92f62] hover:text-[#86234c] disabled:opacity-60"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-xl bg-[#a92f62] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#912652] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a92f62] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-[#a09295]">
          Secure access to Fimonaa Commerce Hub
        </p>
      </div>
    </div>
  );
}
