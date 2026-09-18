"use client";

import Link from "next/link";

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
  platform: string;
  country: string;
  service_category: string;
};

function loadRazorpayScript() {
  if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  document.head.appendChild(script);
}

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [platformFilter, setPlatformFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [targetUrl, setTargetUrl] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [targetCountry, setTargetCountry] = useState("India");
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
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    loadRazorpayScript();

    loadServices();
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        loadOrderStats();
        loadWalletBalance();
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
  .select("id,name,description,type,price_per_100,min_quantity,max_quantity,active,platform,country,service_category")
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
        loadWalletBalance();
    }
  }

  async function loadWalletBalance() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      setWalletBalance(0);
      return;
    }
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    if (error) {
      console.error("Wallet balance error:", error);
      return;
    }
    setWalletBalance(Number(data?.balance ?? 0));
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
        loadWalletBalance();
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
        loadWalletBalance();
    }
  }

  async function handleAddMoney() {
    const amountInput = window.prompt("Enter recharge amount (₹10 to ₹1,00,000):");
    if (!amountInput) return;

    const amount = Number(amountInput);

    if (!Number.isFinite(amount) || amount < 10 || amount > 100000) {
      setMessage("Recharge amount must be between ₹10 and ₹1,00,000.");
      return;
    }

    setMessage("Creating Razorpay order...");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Please login first.");
      return;
    }

    const response = await fetch("/api/recharge/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ amount }),
    });

    const orderData = await response.json();

    if (!response.ok) {
      setMessage(orderData.error || "Could not create payment order.");
      return;
    }

    const RazorpayCheckout = (window as typeof window & {
      Razorpay?: new (options: Record<string, unknown>) => {
        open: () => void;
      };
    }).Razorpay;

    if (!RazorpayCheckout) {
      setMessage("Loading Razorpay Checkout...");

      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        );

        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(), { once: true });
        } else {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        }
      }).catch(() => {
        setMessage("Razorpay Checkout could not load. Check your internet connection and try again.");
      });

      const LoadedRazorpay = (window as typeof window & {
        Razorpay?: new (options: Record<string, unknown>) => {
          open: () => void;
        };
      }).Razorpay;

      if (!LoadedRazorpay) {
        return;
      }

      const checkout = new LoadedRazorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SMM Panel",
        description: "Wallet Recharge",
        order_id: orderData.orderId,
        handler: async (payment: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setMessage("Verifying payment...");

          const verifyResponse = await fetch("/api/recharge/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payment),
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok) {
            setMessage(verifyData.error || "Payment verification failed.");
            return;
          }

          await loadWalletBalance();
          setMessage("Payment successful. Wallet credited.");
        },
        modal: {
          ondismiss: () => setMessage("Payment window closed."),
        },
        theme: {
          color: "#0f172a",
        },
      });

      checkout.open();
      return;
    }

    const checkout = new RazorpayCheckout({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "SMM Panel",
      description: "Wallet Recharge",
      order_id: orderData.orderId,
      handler: async (payment: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setMessage("Verifying payment...");

        const verifyResponse = await fetch("/api/recharge/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payment),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
          setMessage(verifyData.error || "Payment verification failed.");
          return;
        }

        await loadWalletBalance();

        setMessage("Payment successful. Wallet credited.");
      },
      modal: {
        ondismiss: () => {
          setMessage("Payment window closed.");
        },
      },
      theme: {
        color: "#0f172a",
      },
    });

    checkout.open();
  }

  async function handleForgotPassword() {
    setAuthMessage("");

    const resetEmail = email.trim();

    if (!resetEmail) {
      setAuthMessage("Please enter your email first.");
      return;
    }

    setAuthMessage("Sending password reset email...");

    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setAuthMessage("Password reset email sent. Please check your email.");
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

    const { data, error } = await supabase.rpc("create_paid_order", {
      p_user_id: user.id,
      p_service_id: selectedService.id,
      p_target_url: targetUrl.trim(),
      p_quantity: quantityNumber,
      p_target_country: targetCountry,
    });

    if (error) {
      console.error("Paid order error:", error);
      setMessage(`Order failed: ${error.message}`);
      return;
    }

    const orderResult = data as {
      success: boolean;
      order_id: number;
      balance: number;
    };

    setMessage(
      `Order created successfully! Order ID: ${orderResult.order_id}`
    );

    setTargetUrl("");
    setQuantity(String(selectedService.min_quantity));

    loadOrderStats();
        loadWalletBalance();
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

          {!authLoading && (
            <div className="relative">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  <span>👤</span>
                  <span>Profile</span>
                  <span className="text-xs">▼</span>
                </summary>

                <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border bg-white p-2 shadow-xl">
                  {user ? (
                    <div className="border-b px-3 py-2">
                      <p className="text-xs text-slate-400">Logged in as</p>
                      <p className="truncate text-sm font-medium text-slate-700">
                        {user.email}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthMessage("");
                        setShowAuth(true);
                      }}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      🔐 Login
                    </button>
                  )}

                  <Link
                    href="/profile"
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    👤 Profile
                  </Link>

                  <Link
                    href="/"
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    🏠 Dashboard
                  </Link>

                  <Link
                    href="/orders"
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    📦 Orders
                  </Link>

                  <a
                    href="#services"
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    🛍️ Services
                  </a>

                  <Link
                    href="/support"
                    className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    🎫 Support
                  </Link>

                  {user && (
                    <>
                      <div className="my-2 border-t" />

                      <button
                        type="button"
                        onClick={logout}
                        className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        🚪 Logout
                      </button>
                    </>
                  )}
                </div>
              </details>
            </div>
          )}
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
            ["Balance", `₹${walletBalance.toFixed(2)}`],
            ["Services", String(services.length)],
          ].map(([title, value]) => (
            <div key={title} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{title}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        {user && (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Wallet Balance</p>
                <p className="mt-1 text-2xl font-bold">
                  ₹{walletBalance.toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMoney}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Add Money
              </button>
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-2xl font-bold">Services</h2>

          <p className="mt-1 text-sm text-slate-500">
            Select a service to create an order.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="All">All Platforms</option>
              <option value="Instagram">Instagram</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="All">All Countries</option>
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="UAE">UAE</option>
              <option value="Saudi Arabia">Saudi Arabia</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Pakistan">Pakistan</option>
              <option value="Bangladesh">Bangladesh</option>
              <option value="Nepal">Nepal</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="All">All Categories</option>
              <option value="Reels Promotion">Reels Promotion</option>
              <option value="Video Promotion">Video Promotion</option>
              <option value="Followers Promotion">Followers Promotion</option>
              <option value="Profile Promotion">Profile Promotion</option>
              <option value="Likes Promotion">Likes Promotion</option>
              <option value="Comments Promotion">Comments Promotion</option>
            </select>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {services
              .filter((service) =>
                platformFilter === "All" || service.platform === platformFilter
              )
              .filter((service) =>
                countryFilter === "All" || service.country === countryFilter
              )
              .filter((service) =>
                categoryFilter === "All" || service.service_category === categoryFilter
              )
              .map((service) => (
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

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 font-semibold ${
                    selectedService?.id === service.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {service.platform}
                  </span>
                  <span className={`rounded-full px-2 py-1 font-semibold ${
                    selectedService?.id === service.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    🌍 {service.country}
                  </span>
                  <span className={`rounded-full px-2 py-1 font-semibold ${
                    selectedService?.id === service.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {service.service_category}
                  </span>
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

          {services.filter((service) =>
            (platformFilter === "All" || service.platform === platformFilter) &&
            (countryFilter === "All" || service.country === countryFilter) &&
            (categoryFilter === "All" || service.service_category === categoryFilter)
          ).length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <p className="font-semibold text-slate-700">
                No services found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another platform, country or category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPlatformFilter("All");
                  setCountryFilter("All");
                  setCategoryFilter("All");
                }}
                className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Reset Filters
              </button>
            </div>
          )}
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
                  {(() => {
                    const platform = selectedService.platform.toLowerCase();
                    const category = selectedService.service_category;
                    const isEngagement =
                      category === "Likes Promotion" ||
                      category === "Comments Promotion";
                    const isVideo = selectedService.type.toLowerCase() === "reel";

                    if (platform === "youtube") {
                      return isEngagement || isVideo
                        ? "YouTube Video URL"
                        : "YouTube Channel URL";
                    }

                    if (platform === "facebook") {
                      return isEngagement
                        ? "Facebook Post/Reel URL"
                        : isVideo
                        ? "Facebook Reel/Post URL"
                        : "Facebook Page/Profile URL";
                    }

                    if (platform === "tiktok") {
                      return isEngagement || isVideo
                        ? "TikTok Video URL"
                        : "TikTok Profile URL";
                    }

                    if (platform === "instagram") {
                      return isEngagement
                        ? "Instagram Reel/Post URL"
                        : isVideo
                        ? "Instagram Reel URL"
                        : "Instagram Profile URL";
                    }

                    return "Target URL";
                  })()}
                </label>

                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder={(() => {
                    const platform = selectedService.platform.toLowerCase();
                    const isVideo = selectedService.type.toLowerCase() === "reel";
                    const isEngagement =
                      selectedService.service_category === "Likes Promotion" ||
                      selectedService.service_category === "Comments Promotion";

                    if (platform === "youtube") {
                      return isEngagement || isVideo
                        ? "https://www.youtube.com/watch?v=..."
                        : "https://www.youtube.com/@channel";
                    }

                    if (platform === "facebook") {
                      return isEngagement || isVideo
                        ? "https://www.facebook.com/.../posts/..."
                        : "https://www.facebook.com/yourpage";
                    }

                    if (platform === "tiktok") {
                      return isEngagement || isVideo
                        ? "https://www.tiktok.com/@user/video/..."
                        : "https://www.tiktok.com/@username";
                    }

                    if (platform === "instagram") {
                      return isEngagement || isVideo
                        ? "https://www.instagram.com/reel/..."
                        : "https://www.instagram.com/username";
                    }

                    return "https://example.com/...";
                  })()}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />

                <p className="mt-2 text-xs text-slate-500">
                  {(() => {
                    const platform = selectedService.platform.toLowerCase();
                    const isVideo = selectedService.type.toLowerCase() === "reel";
                    const isEngagement =
                      selectedService.service_category === "Likes Promotion" ||
                      selectedService.service_category === "Comments Promotion";

                    if (platform === "youtube") {
                      return isEngagement || isVideo
                        ? "Enter a public YouTube Video URL. Do not enter a password."
                        : "Enter a public YouTube Channel URL. Do not enter a password.";
                    }

                    if (platform === "facebook") {
                      return isEngagement || isVideo
                        ? "Enter a public Facebook Post or Reel URL. Do not enter a password."
                        : "Enter a public Facebook Page/Profile URL. Do not enter a password.";
                    }

                    if (platform === "tiktok") {
                      return isEngagement || isVideo
                        ? "Enter a public TikTok Video URL. Do not enter a password."
                        : "Enter a public TikTok Profile URL. Do not enter a password.";
                    }

                    if (platform === "instagram") {
                      return isEngagement
                        ? "Enter a public Instagram Reel or Post URL. Do not enter an Instagram password."
                        : isVideo
                        ? "Enter a public Instagram Reel URL. Do not enter an Instagram password."
                        : "Enter a public Instagram Profile URL. Do not enter an Instagram password.";
                    }

                    return "Enter a public target URL. Do not enter a password.";
                  })()}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Target Country
                </label>

                <select
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="India">🇮🇳 India</option>
                  <option value="United States">🇺🇸 United States</option>
                  <option value="United Kingdom">🇬🇧 United Kingdom</option>
                  <option value="Canada">🇨🇦 Canada</option>
                  <option value="Australia">🇦🇺 Australia</option>
                  <option value="UAE">🇦🇪 UAE</option>
                  <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                  <option value="Germany">🇩🇪 Germany</option>
                  <option value="France">🇫🇷 France</option>
                  <option value="Pakistan">🇵🇰 Pakistan</option>
                  <option value="Bangladesh">🇧🇩 Bangladesh</option>
                  <option value="Nepal">🇳🇵 Nepal</option>
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  Select the country you want to target for this promotion.
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

              {authMode === "login" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-center text-sm font-medium text-blue-600"
                >
                  Forgot Password?
                </button>
              )}

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
