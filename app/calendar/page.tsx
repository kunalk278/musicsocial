"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ConcertCard, { Concert } from "@/components/ConcertCard";

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/feed")
      .then((r) => r.json())
      .then((d) => {
        setConcerts(d.concerts ?? []);
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
  // Fill to complete weeks
  while (days.length % 7 !== 0) days.push(null);

  function concertsOnDay(day: Date) {
    const str = day.toISOString().split("T")[0];
    return concerts.filter((c) => c.date === str);
  }

  const selectedConcerts = selectedDay ? concertsOnDay(selectedDay) : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col min-h-screen">
      <Nav userName={session.user?.name ?? ""} />
      <main className="max-w-5xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Calendar</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
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
                const shows = concertsOnDay(day);
                const isToday = isSameDay(day, today);
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                      isSelected
                        ? "bg-purple-600 text-white"
                        : isToday
                        ? "bg-white/10 text-white"
                        : "hover:bg-white/5 text-gray-300"
                    }`}
                  >
                    <span className="text-xs">{day.getDate()}</span>
                    {shows.length > 0 && (
                      <span
                        className={`mt-0.5 w-1 h-1 rounded-full ${
                          isSelected ? "bg-white" : "bg-purple-400"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day panel */}
          <div>
            {selectedDay ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">
                  {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                {selectedConcerts.length === 0 ? (
                  <p className="text-gray-600 text-sm">No shows this day.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedConcerts.map((c) => (
                      <ConcertCard key={c.id} concert={c} showFriend />
                    ))}
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
