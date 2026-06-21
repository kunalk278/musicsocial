"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ConcertCard, { Concert } from "@/components/ConcertCard";
import Link from "next/link";

interface Owner {
  id: string;
  name: string;
  city: string;
  shareToken: string;
}

function PublicShareContent() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followMsg, setFollowMsg] = useState("");
  const [showFollowBanner, setShowFollowBanner] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Show the follow banner only when coming from sign-in/sign-up via a share link and logged in
  useEffect(() => {
    if (searchParams.get("pending") === "follow" && session?.user?.id) {
      setShowFollowBanner(true);
    }
  }, [searchParams, session?.user?.id]);

  async function handleFollow() {
    setFollowLoading(true);
    await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareToken }),
    });
    setFollowLoading(false);
    setShowFollowBanner(false);
    setFollowMsg("Following!");
  }

  useEffect(() => {
    fetch(`/api/concerts/public?token=${shareToken}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setOwner(data.user);
        setConcerts(data.concerts ?? []);
        setLoading(false);
      });
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Concert list not found.</p>
          <Link href="/" className="text-purple-400 text-sm mt-2 block">Go home</Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = concerts.filter((c) => c.date >= today);
  const past = concerts.filter((c) => c.date < today);

  function copyFollowLink() {
    navigator.clipboard.writeText(window.location.href);
    setFollowMsg("Copied!");
    setTimeout(() => setFollowMsg(""), 2000);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="font-bold text-lg tracking-tight text-purple-400">
            Bandwagon
          </Link>
          <Link href={`/signup?from=${shareToken}`} className="text-sm text-gray-400 hover:text-white transition-colors">
            Create account
          </Link>
        </div>
      </header>

      {showFollowBanner && owner && (
        <div className="border-b border-purple-500/30 bg-purple-900/30">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-white text-sm font-medium">Follow <span className="text-purple-300">{owner.name}</span>?</p>
              <p className="text-gray-400 text-xs mt-0.5">See their upcoming concerts in your feed</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className="px-4 py-1.5 rounded-lg text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold transition-colors"
              >
                {followLoading ? "Following…" : "Follow"}
              </button>
              <button
                onClick={() => setShowFollowBanner(false)}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            {owner?.name}&apos;s shows
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{owner?.city}</p>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={copyFollowLink}
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {followMsg || "Copy link to share"}
            </button>
            <Link
              href={`/signin?from=${shareToken}`}
              className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Follow {owner?.name}
            </Link>
          </div>
        </div>

        {concerts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🎵</p>
            <p className="text-gray-400">No shows added yet.</p>
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
                    <ConcertCard key={c.id} concert={c} />
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
                    <ConcertCard key={c.id} concert={c} />
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

export default function PublicSharePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-500 text-sm">Loading…</div></div>}>
      <PublicShareContent />
    </Suspense>
  );
}
