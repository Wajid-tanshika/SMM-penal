"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type WalletTransaction = {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  reference_id: string | null;
  status: string;
  created_at: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (walletError) {
        console.error("Wallet error:", walletError);
      }

      const { data: transactionData, error: transactionError } =
        await supabase
          .from("wallet_transactions")
          .select(
            "id, type, amount, description, reference_id, status, created_at"
          )
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(20);

      if (transactionError) {
        console.error("Transactions error:", transactionError);
      }

      if (!mounted) return;

      setBalance(Number(walletData?.balance ?? 0));
      setTransactions(transactionData ?? []);
      setLoading(false);
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
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
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">
          Loading Profile...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-5">

        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">My Profile</p>
              <h1 className="mt-1 text-3xl font-bold">
                {user?.user_metadata?.full_name ||
                  user?.user_metadata?.name ||
                  "User"}
              </h1>
              <p className="mt-2 break-all text-sm text-slate-300">
                {user?.email || "Not logged in"}
              </p>
            </div>

            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {user ? (
          <>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Wallet Balance</p>
                  <p className="mt-1 text-3xl font-bold">
                    ₹{balance.toFixed(2)}
                  </p>
                </div>

                <Link
                  href="/"
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  ➕ Add Money
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/orders"
                className="rounded-2xl bg-white p-5 text-center font-semibold shadow-sm hover:bg-slate-50"
              >
                📦
                <span className="mt-2 block">My Orders</span>
              </Link>

              <Link
                href="/support"
                className="rounded-2xl bg-white p-5 text-center font-semibold shadow-sm hover:bg-slate-50"
              >
                🎫
                <span className="mt-2 block">Support</span>
              </Link>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Wallet Transactions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your latest wallet activity
              </p>

              {transactions.length === 0 ? (
                <div className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No wallet transactions yet.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {transactions.map((transaction) => {
                    const isCredit = transaction.type === "credit";

                    return (
                      <div
                        key={transaction.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {isCredit ? "Wallet Credit" : "Order Payment"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              TXN #{transaction.id}
                            </p>

                            {transaction.description && (
                              <p className="mt-1 text-xs text-slate-500">
                                {transaction.description}
                              </p>
                            )}
                          </div>

                          <p
                            className={`font-bold ${
                              isCredit
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {isCredit ? "+" : "-"}₹
                            {Number(transaction.amount || 0).toFixed(2)}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                          <span>
                            Status:{" "}
                            <span className="font-semibold text-green-600">
                              {transaction.status}
                            </span>
                          </span>

                          <span>
                            {new Date(
                              transaction.created_at
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>

                        {transaction.reference_id && (
                          <p className="mt-2 text-xs text-slate-400">
                            Reference: {transaction.reference_id}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">
                Account Information
              </h2>

              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="break-all font-semibold">{user.email}</p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">User ID</p>
                  <p className="break-all font-mono text-xs">{user.id}</p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Account Created</p>
                  <p className="font-semibold">
                    {new Date(user.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Account Security</h2>

              <Link
                href="/reset-password"
                className="mb-3 block w-full rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white"
              >
                🔐 Change Password
              </Link>

              <button
                type="button"
                onClick={logout}
                className="w-full rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
              >
                🚪 Logout
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <h2 className="mb-3 text-xl font-bold">
              You are not logged in
            </h2>

            <Link
              href="/"
              className="block rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              🔐 Login
            </Link>
          </div>
        )}

        {message && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

      </div>
    </main>
  );
}
