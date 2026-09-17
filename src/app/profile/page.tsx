"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(data.session?.user ?? null);
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center">
          Loading Profile...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">My Profile</p>
              <h1 className="text-3xl font-bold text-slate-900">
                {user?.user_metadata?.full_name ||
                  user?.user_metadata?.name ||
                  "User"}
              </h1>
            </div>

            <a
              href="/"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Dashboard
            </a>
          </div>
        </div>

        {user ? (
          <>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">
                Account Information
              </h2>

              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="break-all font-semibold">
                    {user.email}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">User ID</p>
                  <p className="break-all font-mono text-xs">
                    {user.id}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Account Created
                  </p>
                  <p className="font-semibold">
                    {new Date(user.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">
                Account
              </h2>

              <a
                href="/reset-password"
                className="mb-3 block w-full rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white"
              >
                Change Password
              </a>

              <button
                onClick={logout}
                className="w-full rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <h2 className="mb-3 text-xl font-bold">
              You are not logged in
            </h2>

            <a
              href="/"
              className="block rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              Login
            </a>
          </div>
        )}

        {message && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <a href="/" className="rounded-xl bg-white p-3 text-center text-xs shadow-sm">
            Dashboard
          </a>
          <a href="/orders" className="rounded-xl bg-white p-3 text-center text-xs shadow-sm">
            Orders
          </a>
          <a href="/support" className="rounded-xl bg-white p-3 text-center text-xs shadow-sm">
            Support
          </a>
          <a href="/profile" className="rounded-xl bg-slate-900 p-3 text-center text-xs text-white shadow-sm">
            Profile
          </a>
        </div>

      </div>
    </main>
  );
}
