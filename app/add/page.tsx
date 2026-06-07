"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import CityAutocomplete from "@/components/CityAutocomplete";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface ShowResult {
  externalId: string;
  source?: string;
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

  // Search state
  const [bandName, setBandName] = useState("");
  const [suggestions, setSuggestions] = useState<Artist[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState<ShowResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  // City state
  const [userCity, setUserCity] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [editingCity, setEditingCity] = useState(false);
  const [cityDraft, setCityDraft] = useState("");

  // Manual form state (shown inline when no results)
  const [manualDate, setManualDate] = useState("");
  const [manualVenue, setManualVenue] = useState("");
  const [manualCity, setManualCity] = useState("");

  // Show more toggle for out-of-city results
  const [showOtherCities, setShowOtherCities] = useState(false);

  // Confirm step state
  const [selected, setSelected] = useState<ShowResult | null>(null);
  const [concertStatus, setConcertStatus] = useState("INTERESTED");
  const [step, setStep] = useState<Step>("search");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  // Load user's city and pre-fill manual entry city
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/me").then((r) => r.json()).then((u) => {
      if (u?.city) {
        setUserCity(u.city);
        setSearchCity(u.city);
        setCityDraft(u.city);
        setManualCity(u.city);
      }
    });
  }, [status]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Artist autocomplete — 300ms
  useEffect(() => {
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    if (bandName.trim().length < 2) { setSuggestions([]); return; }
    suggestDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/concerts/suggest?q=${encodeURIComponent(bandName.trim())}`);
      const data = await res.json();
      setSuggestions(data.attractions ?? []);
      setShowSuggestions(true);
    }, 300);
    return () => { if (suggestDebounce.current) clearTimeout(suggestDebounce.current); };
  }, [bandName]);

  // Show search — 800ms, re-runs when city changes too
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setResults([]);
    setSearched(false);
    setApiErrors([]);
    setShowOtherCities(false);
    if (bandName.trim().length < 2 || !searchCity) return;
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch("/api/concerts/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bandName: bandName.trim(), city: searchCity }),
        });
        const data = await res.json();
        setResults(data.events ?? []);
        if (data.apiErrors?.length) setApiErrors(data.apiErrors);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 800);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [bandName, searchCity]);

  if (status === "loading") return null;
  if (status !== "authenticated") return null;

  const noResults = searched && !searching && results.length === 0 && bandName.trim().length >= 2;

  function pickArtist(name: string) {
    setBandName(name);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function pickShow(show: ShowResult) {
    setSelected(show);
    setStep("confirm");
  }

  function submitManual() {
    if (!manualDate) return;
    setSelected({
      externalId: "",
      bandName,
      date: manualDate,
      venue: manualVenue || null,
      city: manualCity || searchCity || null,
      startTime: null,
      ticketUrl: null,
      priceMin: null,
      priceMax: null,
      imageUrl: null,
    });
    setStep("confirm");
  }

  function commitCity() {
    const trimmed = cityDraft.trim();
    if (trimmed) setSearchCity(trimmed);
    else setCityDraft(searchCity); // revert if cleared
    setEditingCity(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/concerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...selected, status: concertStatus }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/my-concerts");
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
  }

  const cityChanged = searchCity && searchCity !== userCity;

  return (
    <div className="flex flex-col min-h-screen">
      <Nav userName={session.user?.name ?? ""} />
      <main className="max-w-2xl mx-auto w-full px-4 py-8">

        {step === "search" && (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Add a show</h1>
            <p className="text-gray-500 text-sm mb-6">
              Type an artist — we&apos;ll search Ticketmaster and Bandsintown for upcoming shows.
            </p>

            {/* Band input + artist suggestions */}
            <div ref={containerRef} className="relative mb-3">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                autoComplete="off"
                value={bandName}
                onChange={(e) => { setBandName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Band or artist name…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-purple-500 pr-10"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-[#14141f] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                  {suggestions.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onMouseDown={() => pickArtist(a.name)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-600/20 transition-colors text-left"
                      >
                        {a.imageUrl ? (
                          <img src={a.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-xs">🎵</div>
                        )}
                        <span className="text-sm text-white">{a.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* City context row */}
            {searchCity && (
              <div className="flex items-center gap-2 mb-6 min-h-[28px]">
                {editingCity ? (
                  <>
                    <span className="text-xs text-gray-500 shrink-0">Searching near</span>
                    <div className="w-52">
                      <CityAutocomplete
                        value={cityDraft}
                        onChange={setCityDraft}
                        autoFocus
                        onBlur={commitCity}
                        onCommit={commitCity}
                        onEscape={() => { setCityDraft(searchCity); setEditingCity(false); }}
                        inputClassName="w-full bg-white/5 border border-purple-500/60 rounded-lg px-2 py-0.5 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-gray-500">
                      Searching near{" "}
                      <span className={cityChanged ? "text-purple-400" : "text-gray-300"}>
                        {searchCity}
                      </span>
                      {cityChanged && (
                        <button
                          type="button"
                          onClick={() => { setCityDraft(userCity); setSearchCity(userCity); }}
                          className="ml-1 text-gray-600 hover:text-gray-400 underline transition-colors"
                        >
                          (reset)
                        </button>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setCityDraft(searchCity); setEditingCity(true); }}
                      className="text-xs text-gray-600 hover:text-purple-400 transition-colors underline"
                    >
                      Change
                    </button>
                  </>
                )}
              </div>
            )}

            {/* API error banner — visible so we can diagnose key issues */}
            {apiErrors.length > 0 && results.length === 0 && (
              <div className="mb-4 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-red-400 mb-1">Search error</p>
                {apiErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-300/80">{e}</p>
                ))}
              </div>
            )}

            {/* Show results */}
            {results.length > 0 && (() => {
              const cityLower = searchCity.split(",")[0].toLowerCase();
              const cityShows = results.filter((r) => r.city?.toLowerCase().includes(cityLower));
              const otherShows = results.filter((r) => !r.city?.toLowerCase().includes(cityLower));

              function ShowCard({ show }: { show: ShowResult }) {
                return (
                  <button
                    key={show.externalId}
                    onClick={() => pickShow(show)}
                    className="w-full text-left bg-white/5 border border-white/10 hover:border-purple-500/60 hover:bg-purple-600/5 rounded-xl p-4 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {show.imageUrl && (
                        <img src={show.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{show.bandName}</p>
                        <p className="text-sm text-gray-400 mt-0.5 truncate">
                          {show.venue ?? "Venue TBD"}{show.city ? ` · ${show.city}` : ""}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {show.date ? formatDate(show.date) : "Date TBD"}
                          {show.startTime ? ` · ${formatTime(show.startTime)}` : ""}
                          {show.priceMin ? ` · from $${show.priceMin}` : ""}
                        </p>
                      </div>
                      <span className="text-gray-600 group-hover:text-purple-400 transition-colors text-lg shrink-0">→</span>
                    </div>
                  </button>
                );
              }

              return (
                <div className="space-y-3">
                  {cityShows.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                        Upcoming shows in {searchCity.split(",")[0]}
                      </p>
                      {cityShows.map((show) => <ShowCard key={show.externalId} show={show} />)}
                    </>
                  )}

                  {otherShows.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowOtherCities((v) => !v)}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 mb-3"
                      >
                        <span>{showOtherCities ? "▾" : "▸"}</span>
                        {showOtherCities ? "Hide" : `See ${otherShows.length} show${otherShows.length !== 1 ? "s" : ""} in other cities`}
                      </button>
                      {showOtherCities && otherShows.map((show) => <ShowCard key={show.externalId} show={show} />)}
                    </div>
                  )}

                  {cityShows.length === 0 && otherShows.length === 0 && null}
                </div>
              );
            })()}

            {/* Manual form — appears immediately when no results found */}
            {noResults && (
              <div className="mt-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <p className="text-xs text-gray-500 shrink-0">No shows found — add it manually</p>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Artist / Band</label>
                    <input
                      type="text"
                      value={bandName}
                      onChange={(e) => setBandName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Date *</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Venue <span className="text-gray-600">(optional)</span></label>
                      <input
                        type="text"
                        value={manualVenue}
                        onChange={(e) => setManualVenue(e.target.value)}
                        placeholder="e.g. Madison Square Garden"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">City <span className="text-gray-600">(optional)</span></label>
                      <CityAutocomplete
                        value={manualCity}
                        onChange={setManualCity}
                        placeholder="e.g. New York, NY"
                        inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={submitManual}
                    disabled={!manualDate || !bandName.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {step === "confirm" && selected && (
          <>
            <button onClick={() => { setSelected(null); setStep("search"); }}
              className="text-sm text-gray-500 hover:text-white transition-colors mb-6 flex items-center gap-1">
              ← Back
            </button>

            <h1 className="text-2xl font-bold text-white mb-6">Confirm show</h1>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt={selected.bandName} className="w-full h-36 object-cover opacity-80" />
              )}
              <div className="p-4 space-y-1.5">
                <p className="font-bold text-white text-lg">{selected.bandName}</p>
                {selected.venue && (
                  <p className="text-sm text-gray-400">📍 {selected.venue}{selected.city ? ` · ${selected.city}` : ""}</p>
                )}
                {selected.date && (
                  <p className="text-sm text-gray-400">
                    📅 {formatDate(selected.date)}
                    {selected.startTime ? ` · ${formatTime(selected.startTime)}` : ""}
                  </p>
                )}
                {(selected.priceMin || selected.priceMax) && (
                  <p className="text-sm text-gray-400">🎟️ from ${selected.priceMin ?? selected.priceMax}</p>
                )}
                {selected.ticketUrl && (
                  <a href={selected.ticketUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-block text-xs text-purple-400 hover:text-purple-300 mt-1">
                    View tickets →
                  </a>
                )}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">Are you going?</p>
              <div className="flex gap-3">
                {[
                  { value: "ATTENDING", label: "🎟️ I have tickets" },
                  { value: "INTERESTED", label: "👀 I'm interested" },
                ].map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setConcertStatus(value)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${
                      concertStatus === value
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "border-white/10 text-gray-400 hover:border-white/30"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button onClick={handleSave} disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors">
              {saving ? "Saving…" : "Add to my shows"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
