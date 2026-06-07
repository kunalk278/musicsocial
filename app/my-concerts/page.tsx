"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ConcertCard, { Concert } from "@/components/ConcertCard";
import Link from "next/link";

export default function MyConcertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareToken, setShareToken] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/concerts").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()),
    ]).then(([concerts, me]) => {
      setConcerts(concerts);
      setShareToken(me.shareToken ?? "");
      setLoading(false);
    });
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (status !== "authenticated") return null;

  async function handleDelete(id: string) {
    await fetch("/api/concerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConcerts((prev) => prev.filter((c) => c.id !== id));
  }

  function copyShareLink() {
    const url = `${window.location.origin}/u/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = concerts.filter((c) => c.date >= today);
  const past = concerts.filter((c) => c.date < today);

  return (
    <div className="flex flex-col min-h-screen">
      <Nav userName={session.user?.name ?? ""} />
      <main className="max-w-5xl mx-auto w-full px-4 py-8">
        {/* Share bar */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-purple-300">Your share link</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Send this to friends so they can see your shows and follow you.
            </p>
          </div>
          <button
            onClick={copyShareLink}
            className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Shows</h1>
          <Link
            href="/add"
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add show
          </Link>
        </div>

        {concerts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🎵</p>
            <p className="text-gray-400 text-lg mb-2">No shows yet</p>
            <p className="text-gray-600 text-sm mb-6">Add a show to get started.</p>
            <Link
              href="/add"
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Add a show
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mb-10">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
                  Upcoming
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcoming.map((c) => (
                    <ConcertCard key={c.id} concert={c} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
                  Past
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                  {past.map((c) => (
                    <ConcertCard key={c.id} concert={c} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
