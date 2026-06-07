"use client";

export interface Concert {
  id: string;
  bandName: string;
  date: string;
  venue: string | null;
  city: string | null;
  startTime: string | null;
  ticketUrl: string | null;
  priceMin: number | null;
  priceMax: number | null;
  imageUrl: string | null;
  status: string;
  userId?: string;
  user?: { name: string; shareToken: string };
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatPrice(min: number | null, max: number | null) {
  if (!min && !max) return null;
  if (min && max && min !== max) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

export default function ConcertCard({
  concert,
  onDelete,
  showFriend,
}: {
  concert: Concert;
  onDelete?: (id: string) => void;
  showFriend?: boolean;
}) {
  const price = formatPrice(concert.priceMin, concert.priceMax);

  return (
    <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all group">
      {concert.imageUrl && (
        <div className="h-28 overflow-hidden">
          <img
            src={concert.imageUrl}
            alt={concert.bandName}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base truncate">{concert.bandName}</h3>
            {showFriend && concert.user && (
              <p className="text-xs text-purple-400 mt-0.5">
                {concert.user.name} is {concert.status === "ATTENDING" ? "going" : "interested"}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
              concert.status === "ATTENDING"
                ? "bg-green-500/20 text-green-400"
                : "bg-amber-500/20 text-amber-400"
            }`}
          >
            {concert.status === "ATTENDING" ? "Going" : "Interested"}
          </span>
        </div>

        <div className="mt-3 space-y-1 text-sm text-gray-400">
          <div className="flex items-center gap-1.5">
            <span>📅</span>
            <span>{formatDate(concert.date)}</span>
            {concert.startTime && <span>· {formatTime(concert.startTime)}</span>}
          </div>
          {concert.venue && (
            <div className="flex items-center gap-1.5">
              <span>📍</span>
              <span className="truncate">{concert.venue}{concert.city ? ` · ${concert.city}` : ""}</span>
            </div>
          )}
          {price && (
            <div className="flex items-center gap-1.5">
              <span>🎟️</span>
              <span>{price}</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          {concert.ticketUrl ? (
            <a
              href={concert.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              Buy tickets →
            </a>
          ) : (
            <span />
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(concert.id)}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
