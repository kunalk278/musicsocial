"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

interface ShowResult {
  externalId: string;
  bandName: string;
  date: string | null;
  venue: string | null;
  city: string | null;
  startTime: string | null;
  ticketUrl: string | null;
  priceMin: number | null;
  priceMax: number | null;
  imageUrl: string | null;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

type Step = "search" | "confirm";

export default function AddPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bandName, setBandName] = useState("");
  const [results, setResults] = useState<ShowResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<ShowResult | null>(null);
  const [concertStatus, setConcertStatus] = useState("INTERESTED");
  const [step, setStep] = useState<Step>("search");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  useEffect(() => {
    if (bandName.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearched(false);
      try {
        const res = await fetch("/api/concerts/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bandName: bandName.trim() }),
        });
        const data = await res.json();
        setResults(data.events ?? []);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bandName]);

  if (status === "loading") return null;
  if (status !== "authenticated") return null;

  function pickShow(show: ShowResult) {
    setSelected(show);
    setStep("confirm");
  }

  function goBack() {
    setSelected(null);
    setStep("search");
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const body = selected
      ? { ...selected, status: concertStatus }
      : { bandName, status: concertStatus };

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
      <Nav userName={session.user?.name ?? ""} />
      <main className="max-w-2xl mx-auto w-full px-4 py-8">

        {step === "search" && (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Add a show</h1>
            <p className="text-gray-500 text-sm mb-6">
              Type a band or artist — we&apos;ll find upcoming shows in your city.
            </p>

            <div className="relative mb-6">
              <input
                type="text"
                autoFocus
                value={bandName}
                onChange={(e) => setBandName(e.target.value)}
                placeholder="Band or artist name…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-purple-500 pr-10"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {searched && results.length === 0 && bandName.trim().length >= 2 && (
              <div className="text-center py-10">
                <p className="text-gray-400 mb-1">No upcoming shows found in your city.</p>
                <p className="text-gray-600 text-sm">
                  You can still{" "}
                  <button
                    onClick={() => pickShow({ externalId: "", bandName, date: null, venue: null, city: null, startTime: null, ticketUrl: null, priceMin: null, priceMax: null, imageUrl: null })}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    add it manually
                  </button>
                  .
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Upcoming shows in your city
                </p>
                {results.map((show) => (
                  <button
                    key={show.externalId}
                    onClick={() => pickShow(show)}
                    className="w-full text-left bg-white/5 border border-white/10 hover:border-purple-500/60 hover:bg-purple-600/5 rounded-xl p-4 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {show.imageUrl && (
                        <img
                          src={show.imageUrl}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{show.bandName}</p>
                        <p className="text-sm text-gray-400 mt-0.5 truncate">
                          {show.venue ?? "Venue TBD"}
                          {show.city ? ` · ${show.city}` : ""}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {show.date ? formatDate(show.date) : "Date TBD"}
                          {show.startTime ? ` · ${formatTime(show.startTime)}` : ""}
                          {show.priceMin ? ` · from $${show.priceMin}` : ""}
                        </p>
                      </div>
                      <span className="text-gray-600 group-hover:text-purple-400 transition-colors text-lg shrink-0">
                        →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === "confirm" && selected && (
          <>
            <button
              onClick={goBack}
              className="text-sm text-gray-500 hover:text-white transition-colors mb-6 flex items-center gap-1"
            >
              ← Back
            </button>

            <h1 className="text-2xl font-bold text-white mb-6">Confirm show</h1>

            {/* Show summary card */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
              {selected.imageUrl && (
                <img
                  src={selected.imageUrl}
                  alt={selected.bandName}
                  className="w-full h-36 object-cover opacity-80"
                />
              )}
              <div className="p-4 space-y-1.5">
                <p className="font-bold text-white text-lg">{selected.bandName}</p>
                {selected.venue && (
                  <p className="text-sm text-gray-400">
                    📍 {selected.venue}{selected.city ? ` · ${selected.city}` : ""}
                  </p>
                )}
                {selected.date && (
                  <p className="text-sm text-gray-400">
                    📅 {formatDate(selected.date)}
                    {selected.startTime ? ` · ${formatTime(selected.startTime)}` : ""}
                  </p>
                )}
                {(selected.priceMin || selected.priceMax) && (
                  <p className="text-sm text-gray-400">
                    🎟️ from ${selected.priceMin ?? selected.priceMax}
                  </p>
                )}
                {selected.ticketUrl && (
                  <a
                    href={selected.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-purple-400 hover:text-purple-300 mt-1"
                  >
                    View tickets →
                  </a>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">Are you going?</p>
              <div className="flex gap-3">
                {[
                  { value: "ATTENDING", label: "🎟️ I have tickets" },
                  { value: "INTERESTED", label: "👀 I'm interested" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setConcertStatus(value)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${
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

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? "Saving…" : "Add to my shows"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
