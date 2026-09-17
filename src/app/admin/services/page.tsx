"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Service = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  price_per_100: number;
  min_quantity: number;
  max_quantity: number;
  active: boolean;
};

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
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
      setMessage("Please login first.");
      setLoading(false);
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
      setMessage("Access denied. Admin account required.");
      setLoading(false);
      return;
    }

    setIsAdmin(true);
    await loadServices();

    setLoading(false);
  }

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      setMessage(`Failed to load services: ${error.message}`);
      return;
    }

    setServices(data ?? []);
  }

  function updateLocal(
    id: number,
    field: keyof Service,
    value: string | number | boolean
  ) {
    setServices((current) =>
      current.map((service) =>
        service.id === id
          ? { ...service, [field]: value }
          : service
      )
    );
  }

  async function saveService(service: Service) {
    setMessage("Saving...");

    const { error } = await supabase
      .from("services")
      .update({
        name: service.name,
        description: service.description,
        type: service.type,
        price_per_100: Number(service.price_per_100),
        min_quantity: Number(service.min_quantity),
        max_quantity: Number(service.max_quantity),
        active: service.active,
      })
      .eq("id", service.id);

    if (error) {
      console.error(error);
      setMessage(`Save failed: ${error.message}`);
      return;
    }

    setMessage(`Service "${service.name}" saved successfully.`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 text-center">
          Loading Services...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">🔒</div>

          <h1 className="mt-4 text-2xl font-bold">
            Admin Access Required
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            {message}
          </p>

          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold">
              Services Management
            </h1>

            <p className="text-xs text-slate-500">
              Manage services and pricing
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin"
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium"
            >
              Orders
            </Link>

            <Link
              href="/"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="rounded-3xl bg-slate-900 p-7 text-white shadow-lg">
          <p className="text-sm text-slate-300">
            Admin Settings
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Services & Pricing
          </h2>

          <p className="mt-3 text-sm text-slate-300">
            Update service prices, quantity limits and availability.
          </p>
        </section>

        {message && (
          <div className="mt-6 rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">
            {message}
          </div>
        )}

        <section className="mt-6 space-y-5">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-3xl bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">
                    Service #{service.id}
                  </p>

                  <h3 className="mt-1 text-xl font-bold">
                    {service.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateLocal(
                      service.id,
                      "active",
                      !service.active
                    )
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    service.active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {service.active ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Service Name
                  </label>

                  <input
                    value={service.name}
                    onChange={(e) =>
                      updateLocal(
                        service.id,
                        "name",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Type
                  </label>

                  <select
                    value={service.type}
                    onChange={(e) =>
                      updateLocal(
                        service.id,
                        "type",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
                  >
                    <option value="reel">Reel</option>
                    <option value="profile">Profile</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>

                  <textarea
                    value={service.description ?? ""}
                    onChange={(e) =>
                      updateLocal(
                        service.id,
                        "description",
                        e.target.value
                      )
                    }
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Price per 100
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={service.price_per_100}
                    onChange={(e) =>
                      updateLocal(
                        service.id,
                        "price_per_100",
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Minimum Quantity
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={service.min_quantity}
                    onChange={(e) =>
                      updateLocal(
                        service.id,
                        "min_quantity",
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Maximum Quantity
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={service.max_quantity}
                    onChange={(e) =>
                      updateLocal(
                        service.id,
                        "max_quantity",
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => saveService(service)}
                className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Save Changes
              </button>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
