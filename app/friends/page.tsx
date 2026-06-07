"use client";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Link from "next/link";

interface Friend {
  id: string;
  followeeId: string;
  followee: { id: string; name: string; city: string; shareToken: string };
}

function FriendsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [follows, setFollows] = useState<Friend[]>([]);
  const [token, setToken] = useState(searchParams.get("follow") ?? "");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [myToken, setMyToken] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/follows").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()),
    ]).then(([f, me]) => {
      setFollows(f);
      setMyToken(me.shareToken ?? "");
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

  async function handleAdd() {
    if (!token.trim()) return;
    setAdding(true);
    setError("");
    const extracted = token.trim().split("/u/").pop()?.trim() ?? token.trim();
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareToken: extracted }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add friend");
    } else {
      setFollows((prev) => [...prev, data]);
      setToken("");
    }
  }

  async function handleUnfollow(followeeId: string) {
    await fetch("/api/follows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followeeId }),
    });
    setFollows((prev) => prev.filter((f) => f.followee.id !== followeeId));
  }

  function copyMyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/u/${myToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Nav userName={session.user?.name ?? ""} />
      <main className="max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Friends</h1>

        {/* My share link */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 mb-8">
          <p className="text-sm font-medium text-purple-300 mb-1">Share your concert list</p>
          <p className="text-xs text-gray-500 mb-3">
            Send this link to friends so they can follow you.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/u/${myToken}`}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-400 focus:outline-none"
            />
            <button
              onClick={copyMyLink}
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Add friend */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8">
          <p className="text-sm font-medium text-white mb-3">Follow a friend</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Paste their share link or token"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !token.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {adding ? "Adding…" : "Follow"}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        {/* Following list */}
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Following ({follows.length})
          </p>
          {follows.length === 0 ? (
            <p className="text-gray-600 text-sm">Not following anyone yet.</p>
          ) : (
            <div className="space-y-2">
              {follows.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <div>
                    <Link
                      href={`/u/${f.followee.shareToken}`}
                      className="font-medium text-white hover:text-purple-400 transition-colors"
                    >
                      {f.followee.name}
                    </Link>
                    <p className="text-xs text-gray-500">{f.followee.city}</p>
                  </div>
                  <button
                    onClick={() => handleUnfollow(f.followee.id)}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                  >
                    Unfollow
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-500 text-sm">Loading…</div></div>}>
      <FriendsContent />
    </Suspense>
  );
}
