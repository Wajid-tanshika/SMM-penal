"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Order = {
  id: number;
  user_id: string;
  service: string;
  target_url: string;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
};

type AdminUser = {
  user_id: string;
  email: string | null;
  created_at: string;
};

type AdminTransaction = {
  id: number;
  user_id: string;
  type: string;
  amount: number;
  description: string | null;
  reference_id: string | null;
  status: string;
  created_at: string;
};

type AdminRecharge = {
  id: number;
  user_id: string;
  amount: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [recharges, setRecharges] = useState<AdminRecharge[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const { data: admin, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setMessage(`Admin check failed: ${error.message}`);
      setLoading(false);
      return;
    }

    if (!admin) {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return;
    }

    setIsAdmin(true);

    await Promise.all([
      loadOrders(),
      loadAdminData(),
    ]);

    setLoading(false);
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(`Failed to load orders: ${error.message}`);
      return;
    }

    setOrders(data ?? []);
  }

  async function loadAdminData() {
    const { data, error } = await supabase.rpc(
      "admin_get_dashboard_data"
    );

    if (error) {
      console.error(error);
      setMessage(`Failed to load admin data: ${error.message}`);
      return;
    }

    setUsers(Array.isArray(data?.users) ? data.users : []);
    setTransactions(
      Array.isArray(data?.transactions) ? data.transactions : []
    );
    setRecharges(
      Array.isArray(data?.recharges) ? data.recharges : []
    );
  }

  async function updateStatus(orderId: number, status: string) {
    setMessage("Updating order...");

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );

    setMessage(`Order #${orderId} updated successfully.`);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  function formatDate(date: string | null) {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function shortId(value: string | null) {
    if (!value) return "-";

    if (value.length <= 18) return value;

    return `${value.slice(0, 8)}...${value.slice(-6)}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-8 text-center">
          Loading Admin Panel...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pending = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const processing = orders.filter(
    (order) => order.status === "processing"
  ).length;

  const completed = orders.filter(
    (order) => order.status === "completed"
  ).length;

  const totalCredits = transactions
    .filter((item) => item.type === "credit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalDebits = transactions
    .filter((item) => item.type === "debit")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-xs text-slate-500">
                SMM Panel Management
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Logout
            </button>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Orders
            </Link>

            <Link
              href="/admin/services"
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium"
            >
              Services
            </Link>

            <Link
              href="/admin/support"
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium"
            >
              Support
            </Link>

            <Link
              href="/admin/wallet"
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium"
            >
              Wallet
            </Link>

            <Link
              href="/"
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium"
            >
              Customer Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="rounded-3xl bg-slate-900 p-7 text-white shadow-lg">
          <p className="text-sm text-slate-300">Administration</p>
          <h2 className="mt-2 text-3xl font-bold">
            SMM Panel Management
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            Manage orders, customers, wallet transactions and
            recharge history.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="mt-2 text-3xl font-bold">{orders.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="mt-2 text-3xl font-bold">{pending}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Processing</p>
            <p className="mt-2 text-3xl font-bold">{processing}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-bold">{completed}</p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Users</p>
            <p className="mt-2 text-3xl font-bold">{users.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Transactions</p>
            <p className="mt-2 text-3xl font-bold">
              {transactions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Recharge Records</p>
            <p className="mt-2 text-3xl font-bold">
              {recharges.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Wallet Credits</p>
            <p className="mt-2 text-2xl font-bold">
              ₹{totalCredits.toFixed(2)}
            </p>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl bg-white p-4 text-sm shadow-sm">
            {message}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-2xl font-bold">👥 Users</h2>

          <div className="mt-4 space-y-3">
            {users.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-slate-500 shadow-sm">
                No users found.
              </div>
            ) : (
              users.map((item) => (
                <div
                  key={item.user_id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">
                        {item.email || "Email unavailable"}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        User ID: {item.user_id}
                      </p>
                    </div>

                    <p className="text-xs text-slate-500">
                      Joined: {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">
                💰 Wallet Transactions
              </h2>
              <p className="text-sm text-slate-500">
                Latest wallet credits, debits and refunds.
              </p>
            </div>

            <div className="text-sm text-slate-600">
              Total Debits:{" "}
              <span className="font-bold">
                ₹{totalDebits.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {transactions.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-slate-500 shadow-sm">
                No wallet transactions found.
              </div>
            ) : (
              transactions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold uppercase">
                          {item.type}
                        </span>

                        <span className="text-lg font-bold">
                          ₹{Number(item.amount || 0).toFixed(2)}
                        </span>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                          {item.status}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-xs text-slate-500">
                        User: {item.user_id}
                      </p>

                      {item.description && (
                        <p className="mt-1 text-sm">
                          {item.description}
                        </p>
                      )}

                      {item.reference_id && (
                        <p className="mt-1 text-xs text-slate-500">
                          Reference: {item.reference_id}
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 md:text-right">
                      <p>TXN #{item.id}</p>
                      <p className="mt-1">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">💳 Recharge History</h2>
          <p className="text-sm text-slate-500">
            Razorpay wallet recharge records.
          </p>

          <div className="mt-4 space-y-3">
            {recharges.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-slate-500 shadow-sm">
                No recharge records found.
              </div>
            ) : (
              recharges.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold">
                          ₹{Number(item.amount || 0).toFixed(2)}
                        </span>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold uppercase">
                          {item.status}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-xs text-slate-500">
                        User: {item.user_id}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Razorpay Order: {shortId(item.razorpay_order_id)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Razorpay Payment:{" "}
                        {shortId(item.razorpay_payment_id)}
                      </p>
                    </div>

                    <div className="text-xs text-slate-500 md:text-right">
                      <p>Recharge #{item.id}</p>
                      <p className="mt-1">
                        Created: {formatDate(item.created_at)}
                      </p>
                      <p className="mt-1">
                        Paid: {formatDate(item.paid_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">📦 All Orders</h2>

          <div className="mt-4 space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-slate-500 shadow-sm">
                No orders found.
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold">
                          Order #{order.id}
                        </p>
                        <p className="text-sm text-slate-500">
                          {order.service}
                        </p>
                      </div>

                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateStatus(order.id, e.target.value)
                        }
                        className="rounded-xl border px-3 py-2 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">
                          Processing
                        </option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                      <div>
                        <span className="font-semibold">
                          Customer ID:
                        </span>
                        <p className="mt-1 break-all text-slate-500">
                          {order.user_id}
                        </p>
                      </div>

                      <div>
                        <span className="font-semibold">Target:</span>
                        <p className="mt-1 break-all text-slate-500">
                          {order.target_url}
                        </p>
                      </div>

                      <div>
                        <span className="font-semibold">
                          Quantity:
                        </span>
                        <p className="mt-1 text-slate-500">
                          {order.quantity}
                        </p>
                      </div>

                      <div>
                        <span className="font-semibold">Price:</span>
                        <p className="mt-1 text-slate-500">
                          ₹{Number(order.price || 0).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <span className="font-semibold">Date:</span>
                        <p className="mt-1 text-slate-500">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
