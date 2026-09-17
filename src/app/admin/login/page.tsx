"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleForgotPassword() {
    setMessage("");

    const resetEmail = email.trim();

    if (!resetEmail) {
      setMessage("Please enter your admin email first.");
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setResetLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password reset email sent. Please check your email.");
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: admin, error: adminError } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (adminError) {
      await supabase.auth.signOut();
      setMessage(`Admin check failed: ${adminError.message}`);
      setLoading(false);
      return;
    }

    if (!admin) {
      await supabase.auth.signOut();
      setMessage("Access denied. This account is not an admin.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <div className="text-center">
            <div className="text-5xl">🔐</div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Admin Login
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sign in with your admin account
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Admin Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />
            </div>

            {message && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || resetLoading}
              className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Admin Login"}
            </button>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading || loading}
              className="w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-60"
            >
              {resetLoading ? "Sending reset email..." : "Forgot Password?"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700"
          >
            Back to SMM Panel
          </button>
        </div>
      </div>
    </main>
  );
}
