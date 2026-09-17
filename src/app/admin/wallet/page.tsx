"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminWalletPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("Admin wallet recharge");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [crediting, setCrediting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!admin) {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  }

  async function creditWallet(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const cleanUserId = userId.trim();
    const numericAmount = Number(amount);

    if (!cleanUserId) {
      setMessage("Please enter customer User ID.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    setCrediting(true);

    const { data, error } = await supabase.rpc(
      "admin_credit_wallet",
      {
        target_user_id: cleanUserId,
        credit_amount: numericAmount,
        note: note.trim() || "Admin wallet recharge",
      }
    );

    setCrediting(false);

    if (error) {
      setMessage(`Recharge failed: ${error.message}`);
      return;
    }

    setMessage(
      `Wallet credited successfully. New balance: ₹${Number(
        data?.balance ?? 0
      ).toFixed(2)}`
    );

    setAmount("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center">
          Loading...
        </div>
      </main>
    );
  }

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Admin Wallet</h1>
              <p className="text-xs text-slate-500">
                Customer wallet management
              </p>
            </div>

            <button
              onClick={() => router.push("/admin")}
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8">
        <section className="rounded-3xl bg-slate-900 p-7 text-white shadow-lg">
          <p className="text-sm text-slate-300">Wallet Management</p>
          <h2 className="mt-2 text-3xl font-bold">Add Customer Balance</h2>
          <p className="mt-3 text-sm text-slate-300">
            Credit money to a customer's wallet.
          </p>
        </section>

        <form
          onSubmit={creditWallet}
          className="mt-6 rounded-3xl bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Customer User ID
            </label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Customer UUID"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">
              Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">
              Note
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          {message && (
            <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={crediting}
            className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {crediting ? "Crediting..." : "Add Balance"}
          </button>
        </form>
      </div>
    </main>
  );
}
