"use client";

import { useEffect, useState } from "react";
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

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [targetUrl, setTargetUrl] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [message, setMessage] = useState("");

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [orderCount, setOrderCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    loadServices();
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        loadOrderStats();
      } else {
        setOrderCount(0);
        setCompletedCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadServices() {
    const { data, error } = await supabase
  .from("services")
  .select("id,name,description,type,price_per_100,min_quantity,max_quantity,active")
  .order("id", { ascending: true });

if (error) {
  console.error("Services load error:", error);
  setServices([]);
} else {
  const activeServices = (data || []).filter(
    (service) => service.active === true
  );

  setServices(activeServices);

  if (activeServices.length > 0) {
    setSelectedService(activeServices[0]);
    setQuantity(String(activeServices[0].min_quantity));
  }
}
        if (error) {
    console.error("Services load error:", error);
    setServices([]);
  } else {
    const activeServices = (data || []).filter(
      (service) => service.active === true
    );

    setServices(activeServices);

    if (activeServices.length > 0) {
      setSelectedService(activeServices[0]);
      setQuantity(String(activeServices[0].min_quantity));
    }
  }

    if (error) {
      console.error("Services error:", error);
      setMessage(`Failed to load services: ${error.message}`);
      return;
    }

    const loadedServices = data ?? [];

    setServices(loadedServices);

    if (loadedServices.length > 0) {
      setSelectedService(loadedServices[0]);
      setQuantity(String(loadedServices[0].min_quantity));
    }
  }

  async function loadUser() {
    const { data } = await supabase.auth.getUser();

    setUser(data.user ?? null);
    setAuthLoading(false);

    if (data.user) {
      loadOrderStats();
    }
  }

  async function loadOrderStats() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setOrderCount(0);
      setCompletedCount(0);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("status")
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Order stats error:", error);
      return;
    }

    setOrderCount(data?.length ?? 0);

    setCompletedCount(
      data?.filter((order) => order.status === "completed").length ?? 0
    );
  }

  function selectService(service: Service) {
    setSelectedService(service);
    setTargetUrl("");
    setMessage("");
    setQuantity(String(service.min_quantity));
  }

  function calculatePrice() {
    if (!selectedService) return 0;

    const quantityNumber = Number(quantity);

    if (!quantityNumber || quantityNumber < 1) {
      return 0;
    }

    return (
      (quantityNumber / 100) *
      Number(selectedService.price_per_100)
    );
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthMessage("");

    if (!email.trim() || !password) {
      setAuthMessage("Email and password are required.");
      return;
    }

    if (password.length < 6) {
      setAuthMessage("Password must be at least 6 characters.");
      return;
    }

    setAuthMessage("Please wait...");

    if (authMode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthMessage(error.message);
        return;
      }

      if (data.user) {
        setUser(data.user);
        setShowAuth(false);
        setEmail("");
        setPassword("");
        setAuthMessage("");
        loadOrderStats();
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthMessage(error.message);
        return;
      }

      setUser(data.user);
      setShowAuth(false);
      setEmail("");
      setPassword("");
      setAuthMessage("");
      loadOrderStats();
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    setUser(null);
    setOrderCount(0);
    setCompletedCount(0);
    setMessage("Logged out successfully.");
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedService) {
      setMessage("Please select a service.");
      return;
    }

    if (!user) {
      setAuthMode("login");
      setShowAuth(true);
      setAuthMessage("Please login before creating an order.");
      return;
    }

    if (!targetUrl.trim()) {
      setMessage(
        selectedService.type === "reel"
          ? "Please enter the Instagram Reel URL."
          : "Please enter the Instagram Profile URL."
      );
      return;
    }

    const quantityNumber = Number(quantity);

    if (!quantityNumber || quantityNumber < selectedService.min_quantity) {
      setMessage(
        `Minimum quantity is ${selectedService.min_quantity}.`
      );
      return;
    }

    if (quantityNumber > selectedService.max_quantity) {
      setMessage(
        `Maximum quantity is ${selectedService.max_quantity}.`
      );
      return;
    }

    console.log("ORDER USER CHECK:", user?.id, user?.email);

    setMessage("Creating order...");

    const price = calculatePrice();

    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        service: selectedService.name,
        target_url: targetUrl.trim(),
        quantity: quantityNumber,
        price: Number(price.toFixed(2)),
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase order error:", error);
      setMessage(`Order failed: ${error.message}`);
      return;
    }

    setMessage(
      `Order created successfully! Order ID: ${data.id}`
    );

    setTargetUrl("");
    setQuantity(String(selectedService.min_quantity));

    loadOrderStats();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold">SMM Panel</h1>
            <p className="text-xs text-slate-500">
              Social Media Marketing
            </p>
          </div>

          {!authLoading &&
            (user ? (
              <div className="flex items-center gap-2">
                <span className="hidden max-w-[160px] truncate text-xs text-slate-500 sm:block">
                  {user.email}
                </span>

                <button
                  onClick={logout}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthMessage("");
                  setShowAuth(true);
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Login
              </button>
            ))}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="rounded-3xl bg-slate-900 p-7 text-white shadow-lg">
          <p className="mb-2 text-sm text-slate-300">
            Welcome to your marketing dashboard
          </p>

          <h2 className="text-3xl font-bold sm:text-4xl">
            Social Media Marketing Panel
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Choose a service and submit your public Instagram content or
            profile URL.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Orders", String(orderCount)],
            ["Completed", String(completedCount)],
            ["Balance", "₹0"],
            ["Services", String(services.length)],
          ].map(([title, value]) => (
            <div key={title} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{title}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold">Services</h2>

          <p className="mt-1 text-sm text-slate-500">
            Select a service to create an order.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => selectService(service)}
                className={`rounded-2xl border p-5 text-left transition ${
                  selectedService?.id === service.id
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                    : "border-slate-200 bg-white hover:border-slate-400"
                }`}
              >
                <div className="text-3xl">
                  {service.type === "reel" ? "🎬" : "👤"}
                </div>

                <h3 className="mt-4 font-bold">
                  {service.name}
                </h3>

                <p
                  className={`mt-2 text-sm ${
                    selectedService?.id === service.id
                      ? "text-slate-300"
                      : "text-slate-500"
                  }`}
                >
                  {service.description}
                </p>

                <p
                  className={`mt-3 text-sm font-semibold ${
                    selectedService?.id === service.id
                      ? "text-white"
                      : "text-slate-700"
                  }`}
                >
                  ₹{Number(service.price_per_100).toFixed(2)} / 100
                </p>
              </button>
            ))}
          </div>
        </section>

        {selectedService && (
          <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {selectedService.type === "reel" ? "🎬" : "👤"}
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  {selectedService.name}
                </h2>

                <p className="text-sm text-slate-500">
                  No Instagram password or login required.
                </p>
              </div>
            </div>

            <form onSubmit={submitOrder} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {selectedService.type === "reel"
                    ? "Instagram Reel URL"
                    : "Instagram Profile URL"}
                </label>

                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder={
                    selectedService.type === "reel"
                      ? "https://www.instagram.com/reel/..."
                      : "https://www.instagram.com/username"
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Enter a public Instagram URL. Do not enter an Instagram
                  password.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Quantity
                </label>

                <input
                  type="number"
                  min={selectedService.min_quantity}
                  max={selectedService.max_quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Minimum: {selectedService.min_quantity} · Maximum:{" "}
                  {selectedService.max_quantity}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Estimated Price
                  </span>

                  <span className="text-xl font-bold">
                    ₹{calculatePrice().toFixed(2)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Rate: ₹
                  {Number(selectedService.price_per_100).toFixed(2)}
                  {" / 100"}
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Create Order
              </button>

              {message && (
                <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                  {message}
                </div>
              )}
            </form>
          </section>
        )}

        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <a
            href="/"
            className="rounded-2xl bg-white p-5 text-center font-medium shadow-sm hover:bg-slate-50"
          >
            Dashboard
          </a>

          <a
            href="/orders"
            className="rounded-2xl bg-white p-5 text-center font-medium shadow-sm hover:bg-slate-50"
          >
            Orders
          </a>

          <a
            href="/admin/services"
            className="rounded-2xl bg-white p-5 text-center font-medium shadow-sm hover:bg-slate-50"
          >
            Services
          </a>

          <button className="rounded-2xl bg-white p-5 text-center font-medium shadow-sm hover:bg-slate-50">
            Support
          </button>

          {user ? (
            <a
              href="/profile"
              className="rounded-2xl bg-white p-5 text-center font-medium shadow-sm hover:bg-slate-50"
            >
              Profile
            </a>
          ) : (
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthMessage("");
                setShowAuth(true);
              }}
              className="rounded-2xl bg-white p-5 text-center font-medium shadow-sm hover:bg-slate-50"
            >
              Login
            </button>
          )}
        </section>

        <footer className="py-8 text-center text-sm text-slate-500">
          © 2026 SMM Panel
        </footer>
      </div>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {authMode === "login" ? "Login" : "Create Account"}
              </h2>

              <button
                onClick={() => setShowAuth(false)}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAuth} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
              >
                {authMode === "login" ? "Login" : "Register"}
              </button>

              {authMessage && (
                <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
                  {authMessage}
                </div>
              )}
            </form>

            <button
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "register" : "login"
                );
                setAuthMessage("");
              }}
              className="mt-5 w-full text-center text-sm font-medium text-slate-600"
            >
              {authMode === "login"
                ? "New user? Create an account"
                : "Already have an account? Login"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
