"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Ticket = {
  id: number;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTickets() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Admin login required.");
      setLoading(false);
      return;
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!admin) {
      setMessage("Admin Access Required");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setTickets(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function updateTicket(
    id: number,
    status: string,
    reply: string
  ) {
    const { error } = await supabase
      .from("support_tickets")
      .update({
        status,
        admin_reply: reply.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadTickets();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <a
          href="/admin"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Admin
        </a>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Admin Support
        </h1>

        <p className="mt-2 text-gray-600">
          Customer support tickets manage करें।
        </p>

        {message && (
          <div className="mt-5 rounded-xl bg-white p-4 shadow-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-5">
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-5 text-gray-600">
            कोई support ticket नहीं मिला।
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onSave={updateTicket}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TicketCard({
  ticket,
  onSave,
}: {
  ticket: Ticket;
  onSave: (
    id: number,
    status: string,
    reply: string
  ) => Promise<void>;
}) {
  const [status, setStatus] = useState(ticket.status);
  const [reply, setReply] = useState(ticket.admin_reply || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(ticket.id, status, reply);
    setSaving(false);
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          #{ticket.id} — {ticket.subject}
        </h2>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
          {ticket.status}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-gray-700">
        {ticket.message}
      </p>

      <div className="mt-4 text-xs text-gray-500">
        User ID: {ticket.user_id}
      </div>

      <div className="mt-5">
        <label className="mb-1 block text-sm font-medium">
          Admin Reply
        </label>

        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder="Customer को reply लिखें..."
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-3"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>

        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Reply"}
        </button>
      </div>
    </div>
  );
}
