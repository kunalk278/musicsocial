"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ConcertCard, { Concert } from "@/components/ConcertCard";
import Link from "next/link";

interface Friend {
  id: string;
  name: string;
  city: string;
  shareToken: string;
}

export default function FeedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filterFriend, setFilterFriend] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/feed")
      .then((r) => r.json())
      .then((d) => {
        setConcerts(d.concerts ?? []);
        setFriends(d.friends ?? []);
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

  const filtered =
    filterFriend === "all"
      ? concerts
      : concerts.filter((c) => c.user?.shareToken === filterFriend);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = filtered.filter((c) => c.date >= today);
  const past = filtered.filter((c) => c.date < today);

  return (
    <div className="flex flex-col min-h-screen">
      <Nav userName={session.user?.name ?? ""} />
      <main className="max-w-5xl mx-auto w-full px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Friends&apos; Shows</h1>
          <select
            value={filterFriend}
            onChange={(e) => setFilterFriend(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All friends</option>
            {friends.map((f) => (
              <option key={f.id} value={f.shareToken}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {concerts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🎸</p>
            <p className="text-gray-400 text-lg mb-2">No shows yet</p>
            <p className="text-gray-600 text-sm mb-6">
              Add friends to see what shows they&apos;re going to.
            </p>
            <Link
              href="/friends"
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Add friends
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
                    <ConcertCard key={c.id} concert={c} showFriend />
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
                    <ConcertCard key={c.id} concert={c} showFriend />
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
