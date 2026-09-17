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

export default function AdminPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
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
    await loadOrders();

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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 text-center">
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
          <p className="text-sm text-slate-300">
            Administration
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Order Management
          </h2>

          <p className="mt-3 text-sm text-slate-300">
            View and manage customer orders.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="mt-2 text-2xl font-bold">{orders.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-bold">{pending}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Processing</p>
            <p className="mt-2 text-2xl font-bold">{processing}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-2xl font-bold">{completed}</p>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">
            {message}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-2xl font-bold">All Orders</h2>

          {orders.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white p-8 text-center shadow-sm">
              <div className="text-4xl">📦</div>
              <p className="mt-3 text-slate-500">
                No orders found.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-400">
                        Order #{order.id}
                      </p>

                      <h3 className="mt-1 text-lg font-bold">
                        {order.service}
                      </h3>
                    </div>

                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateStatus(order.id, e.target.value)
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      <strong>Customer ID:</strong>{" "}
                      <span className="break-all text-slate-500">
                        {order.user_id}
                      </span>
                    </p>

                    <p>
                      <strong>Target:</strong>{" "}
                      <span className="break-all text-slate-500">
                        {order.target_url}
                      </span>
                    </p>

                    <p>
                      <strong>Quantity:</strong> {order.quantity}
                    </p>

                    <p>
                      <strong>Price:</strong>{" "}
                      ₹{Number(order.price || 0).toFixed(2)}
                    </p>

                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(order.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
