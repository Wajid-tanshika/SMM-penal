"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Order = {
  id: number;
  service: string;
  target_url: string;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please login to view your orders.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Orders error:", error);
      setMessage(`Failed to load orders: ${error.message}`);
      setLoading(false);
      return;
    }

    setOrders(data ?? []);
    setLoading(false);
  }

  function statusClass(status: string) {
    if (status === "completed") {
      return "bg-green-100 text-green-700";
    }

    if (status === "processing") {
      return "bg-blue-100 text-blue-700";
    }

    if (status === "cancelled") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold">My Orders</h1>
            <p className="text-xs text-slate-500">
              Your order history
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="rounded-3xl bg-slate-900 p-7 text-white shadow-lg">
          <p className="text-sm text-slate-300">
            Order History
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            My Orders
          </h2>

          <p className="mt-3 text-sm text-slate-300">
            View your submitted marketing orders and their current status.
          </p>
        </section>

        {loading && (
          <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm">
            Loading orders...
          </div>
        )}

        {!loading && message && (
          <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">{message}</p>

            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {!loading && !message && orders.length === 0 && (
          <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">📦</div>

            <h3 className="mt-4 text-xl font-bold">
              No orders yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Your orders will appear here after you create one.
            </p>

            <Link
              href="/"
              className="mt-5 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Create Order
            </Link>
          </div>
        )}

        {!loading && !message && orders.length > 0 && (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">
                      Order #{order.id}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      {order.service}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Target:</span>{" "}
                    <span className="break-all text-slate-500">
                      {order.target_url}
                    </span>
                  </div>

                  <div>
                    <span className="font-medium">Quantity:</span>{" "}
                    {order.quantity}
                  </div>

                  <div>
                    <span className="font-medium">Price:</span>{" "}
                    ₹{Number(order.price || 0).toFixed(2)}
                  </div>

                  <div>
                    <span className="font-medium">Date:</span>{" "}
                    {new Date(order.created_at).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
