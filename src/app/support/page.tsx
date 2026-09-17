"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Ticket = {
  id: number;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [notice, setNotice] = useState("");

  async function loadTickets() {
    setLoadingTickets(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoadingTickets(false);
      return;
    }

    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setTickets(data || []);
    setLoadingTickets(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function submitTicket(e: FormEvent) {
    e.preventDefault();
    setNotice("");

    if (!subject.trim() || !message.trim()) {
      setNotice("Subject और message दोनों भरें।");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotice("पहले login करें।");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
    });

    if (error) {
      setNotice("Ticket भेजने में समस्या हुई।");
      setLoading(false);
      return;
    }

    setSubject("");
    setMessage("");
    setNotice("Support ticket successfully भेज दिया गया।");
    setLoading(false);

    loadTickets();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <a
            href="/"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Home
          </a>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Support
          </h1>

          <p className="mt-2 text-gray-600">
            अपनी समस्या बताएं। हमारी support team ticket देखकर reply करेगी।
          </p>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Create Support Ticket
          </h2>

          <form onSubmit={submitTicket} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Subject
              </label>

              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="जैसे: Order के बारे में समस्या"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Message
              </label>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="अपनी समस्या पूरी तरह लिखें..."
                rows={5}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Support Ticket"}
            </button>
          </form>

          {notice && (
            <div className="mt-4 rounded-xl bg-gray-100 p-3 text-sm">
              {notice}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">
            My Support Tickets
          </h2>

          {loadingTickets ? (
            <div className="rounded-xl bg-white p-5">
              Loading...
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-xl bg-white p-5 text-gray-600">
              अभी कोई support ticket नहीं है।
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">
                      {ticket.subject}
                    </h3>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                      {ticket.status}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-gray-700">
                    {ticket.message}
                  </p>

                  {ticket.admin_reply && (
                    <div className="mt-4 rounded-xl bg-blue-50 p-4">
                      <div className="mb-1 text-sm font-semibold">
                        Admin Reply
                      </div>

                      <p className="whitespace-pre-wrap text-sm text-gray-700">
                        {ticket.admin_reply}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-500">
                    {new Date(ticket.created_at).toLocaleString()}
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
