"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

interface LookupResult {
  externalId: string;
  bandName: string;
  date: string;
  venue: string | null;
  city: string | null;
  startTime: string | null;
  ticketUrl: string | null;
  priceMin: number | null;
  priceMax: number | null;
  imageUrl: string | null;
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function AddPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bandName, setBandName] = useState("");
  const [date, setDate] = useState("");
  const [concertStatus, setConcertStatus] = useState("INTERESTED");
  const [lookupResults, setLookupResults] = useState<LookupResult[]>([]);
  const [selected, setSelected] = useState<LookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [noResults, setNoResults] = useState(false);

  if (status === "unauthenticated") {
    router.push("/signin");
    return null;
  }
  if (status === "loading") return null;

  async function handleLookup() {
    if (!bandName || !date) return;
    setLookupLoading(true);
    setLookupResults([]);
    setSelected(null);
    setNoResults(false);
    setError("");

    const res = await fetch("/api/concerts/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bandName, date }),
    });
    const data = await res.json();
    setLookupLoading(false);

    if (data.events?.length > 0) {
      setLookupResults(data.events);
      setSelected(data.events[0]);
    } else {
      setNoResults(true);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const body = selected
      ? { ...selected, status: concertStatus }
      : { bandName, date, status: concertStatus };

    const res = await fetch("/api/concerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (res.ok) {
      router.push("/my-concerts");
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Nav userName={session?.user?.name ?? ""} />
      <main className="max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Add a show</h1>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          {/* Step 1: Band + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Band / Artist *</label>
              <input
                type="text"
                value={bandName}
                onChange={(e) => setBandName(e.target.value)}
                placeholder="e.g. The National"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Your status</label>
            <div className="flex gap-3">
              {[
                { value: "ATTENDING", label: "🎟️ I have tickets" },
                { value: "INTERESTED", label: "👀 I'm interested" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setConcertStatus(value)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all ${
                    concertStatus === value
                      ? "bg-purple-600 border-purple-500 text-white"
                      : "border-white/10 text-gray-400 hover:border-white/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Lookup */}
          <button
            type="button"
            onClick={handleLookup}
            disabled={!bandName || !date || lookupLoading}
            className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-medium py-2 rounded-lg transition-colors text-sm"
          >
            {lookupLoading ? "Looking up show…" : "🔍 Find show on Ticketmaster"}
          </button>

          {noResults && (
            <p className="text-sm text-amber-400 text-center">
              No shows found near your city for those dates. You can still save it with just the band and date.
            </p>
          )}

          {/* Results */}
          {lookupResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                {lookupResults.length === 1 ? "Found a match:" : `Found ${lookupResults.length} matches — pick one:`}
              </p>
              {lookupResults.map((event) => (
                <button
                  key={event.externalId}
                  type="button"
                  onClick={() => setSelected(event)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    selected?.externalId === event.externalId
                      ? "border-purple-500 bg-purple-600/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {event.imageUrl && (
                      <img src={event.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{event.bandName}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {event.venue ?? "Venue TBD"}
                        {event.city ? ` · ${event.city}` : ""}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {event.date}
                        {event.startTime ? ` at ${formatTime(event.startTime)}` : ""}
                        {event.priceMin ? ` · from $${event.priceMin}` : ""}
                      </p>
                    </div>
                    {selected?.externalId === event.externalId && (
                      <span className="text-purple-400 text-sm">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !bandName || !date}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save show"}
          </button>
        </div>
      </main>
    </div>
  );
}
