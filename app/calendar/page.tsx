"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ConcertCard, { Concert } from "@/components/ConcertCard";

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [myConcerts, setMyConcerts] = useState<Concert[]>([]);
  const [friendConcerts, setFriendConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/concerts").then((r) => r.json()),
      fetch("/api/feed").then((r) => r.json()),
    ]).then(([mine, feed]) => {
      setMyConcerts(Array.isArray(mine) ? mine : []);
      setFriendConcerts(feed.concerts ?? []);
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

  // Build date lookup maps
  const myDates = new Map<string, Concert[]>();
  for (const c of myConcerts) {
    if (!myDates.has(c.date)) myDates.set(c.date, []);
    myDates.get(c.date)!.push(c);
  }

  const friendDates = new Map<string, Concert[]>();
  for (const c of friendConcerts) {
    if (!friendDates.has(c.date)) friendDates.set(c.date, []);
    friendDates.get(c.date)!.push(c);
  }

  // Build calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const days: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (days.length % 7 !== 0) days.push(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedKey = selectedDay ? dateKey(selectedDay) : null;
  const selectedMine = selectedKey ? (myDates.get(selectedKey) ?? []) : [];
  const selectedFriends = selectedKey ? (friendDates.get(selectedKey) ?? []) : [];

  return (
    <div className="flex flex-col min-h-screen">
      <Nav userName={session.user?.name ?? ""} />
      <main className="max-w-5xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Calendar</h1>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            Your shows
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
            Friends&apos; shows
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                className="text-gray-400 hover:text-white px-2 py-1 rounded transition-colors"
              >
                ‹
              </button>
              <h2 className="font-semibold text-white">{formatMonth(currentMonth)}</h2>
              <button
                onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                className="text-gray-400 hover:text-white px-2 py-1 rounded transition-colors"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs text-gray-600 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                if (!day) return <div key={i} />;

                const key = dateKey(day);
                const hasMine = myDates.has(key);
                const hasFriends = friendDates.has(key);
                const isToday = isSameDay(day, today);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;

                const bgClass = isSelected
                  ? "bg-purple-600 ring-2 ring-purple-400"
                  : hasMine && hasFriends
                  ? "bg-gradient-to-br from-purple-600/60 to-teal-500/50"
                  : hasMine
                  ? "bg-purple-600/50"
                  : hasFriends
                  ? "bg-teal-500/40"
                  : isToday
                  ? "bg-white/10"
                  : "hover:bg-white/5";

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`relative aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${bgClass} ${
                      hasMine || hasFriends || isSelected ? "text-white" : "text-gray-300"
                    }`}
                  >
                    <span className="text-xs leading-none">{day.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day panel */}
          <div>
            {selectedDay ? (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-gray-400">
                  {selectedDay.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>

                {selectedMine.length === 0 && selectedFriends.length === 0 && (
                  <p className="text-gray-600 text-sm">No shows this day.</p>
                )}

                {selectedMine.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-2">
                      Your shows
                    </p>
                    <div className="space-y-3">
                      {selectedMine.map((c) => (
                        <ConcertCard key={c.id} concert={c} />
                      ))}
                    </div>
                  </div>
                )}

                {selectedFriends.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-2">
                      Friends&apos; shows
                    </p>
                    <div className="space-y-3">
                      {selectedFriends.map((c) => (
                        <ConcertCard key={c.id} concert={c} showFriend />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-600 text-sm pt-4">
                Click a day to see shows.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
