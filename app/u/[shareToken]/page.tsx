"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ConcertCard, { Concert } from "@/components/ConcertCard";
import Link from "next/link";

interface Owner {
  id: string;
  name: string;
  city: string;
  shareToken: string;
}

export default function PublicSharePage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followMsg, setFollowMsg] = useState("");

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
            ShowShare
          </Link>
          <Link href="/signup" className="text-sm text-gray-400 hover:text-white transition-colors">
            Create account
          </Link>
        </div>
      </header>

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
              href={`/friends?follow=${shareToken}`}
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
