import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface ShowResult {
  externalId: string;
  source: string;
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

// ── Ticketmaster ──────────────────────────────────────────────────────────────
async function fetchTicketmaster(bandName: string, cityName: string): Promise<ShowResult[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const now = new Date();
  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  // Search broadly (no city filter) — TM city filtering misses nearby venues.
  // We sort city-matching results to the top after fetching.
  const url =
    `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${apiKey}` +
    `&keyword=${encodeURIComponent(bandName)}` +
    `&startDateTime=${now.toISOString().split(".")[0]}Z` +
    `&endDateTime=${oneYear.toISOString().split(".")[0]}Z` +
    `&classificationName=music&size=20&sort=date,asc`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.errors || data.fault) {
      console.error("[TM] API error:", JSON.stringify(data).slice(0, 500));
      return [];
    }
    const events: TMEvent[] = data?._embedded?.events ?? [];
    console.log(`[TM] "${bandName}" → ${events.length} events`);

    const cityLower = cityName.toLowerCase();

    // Sort: user's city first, then by date
    events.sort((a, b) => {
      const aCity = (a._embedded?.venues?.[0]?.city?.name ?? "").toLowerCase();
      const bCity = (b._embedded?.venues?.[0]?.city?.name ?? "").toLowerCase();
      const aMatch = aCity.includes(cityLower) ? 0 : 1;
      const bMatch = bCity.includes(cityLower) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return (a.dates?.start?.localDate ?? "").localeCompare(b.dates?.start?.localDate ?? "");
    });

    return events.slice(0, 10).map((e) => {
      const venue = e._embedded?.venues?.[0];
      const priceRange = e.priceRanges?.[0];
      const image = e.images?.find((i) => i.ratio === "16_9" && i.width > 500) ?? e.images?.[0];
      return {
        externalId: `tm-${e.id}`,
        source: "Ticketmaster",
        bandName: e.name,
        date: e.dates?.start?.localDate ?? null,
        venue: venue?.name ?? null,
        city: venue ? `${venue.city?.name}${venue.stateCode ? ", " + venue.stateCode : ""}` : null,
        startTime: e.dates?.start?.localTime ? e.dates.start.localTime.slice(0, 5) : null,
        ticketUrl: e.url ?? null,
        priceMin: priceRange?.min ?? null,
        priceMax: priceRange?.max ?? null,
        imageUrl: image?.url ?? null,
      };
    });
  } catch (err) {
    console.error("[TM] fetch error:", err);
    return [];
  }
}

// ── Bandsintown ───────────────────────────────────────────────────────────────
async function fetchBandsintown(bandName: string, cityName: string): Promise<ShowResult[]> {
  const encoded = encodeURIComponent(bandName);
  const url = `https://rest.bandsintown.com/artists/${encoded}/events?app_id=showshare&date=upcoming`;

  try {
    const res = await fetch(url);
    const raw = await res.json();
    if (!res.ok || !Array.isArray(raw)) {
      console.error("[BIT] API error or unexpected response:", JSON.stringify(raw).slice(0, 300));
      return [];
    }
    const events: BITEvent[] = raw;
    console.log(`[BIT] "${bandName}" → ${events.length} events`);

    const cityLower = cityName.toLowerCase();

    // Sort city matches first, then by date — no hard filter so we don't miss shows
    events.sort((a, b) => {
      const aCity = (a.venue?.city ?? "").toLowerCase();
      const bCity = (b.venue?.city ?? "").toLowerCase();
      const aMatch = aCity.includes(cityLower) ? 0 : 1;
      const bMatch = bCity.includes(cityLower) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return (a.datetime ?? "").localeCompare(b.datetime ?? "");
    });

    return events.slice(0, 10).map((e) => {
      const dt = e.datetime ? new Date(e.datetime) : null;
      const date = dt ? dt.toISOString().split("T")[0] : null;
      const startTime = dt
        ? `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`
        : null;
      const ticketUrl = e.offers?.[0]?.url ?? null;

      return {
        externalId: `bit-${e.id}`,
        source: "Bandsintown",
        bandName: e.lineup?.[0] ?? bandName,
        date,
        venue: e.venue?.name ?? null,
        city: e.venue ? `${e.venue.city}${e.venue.region ? ", " + e.venue.region : ""}` : null,
        startTime,
        ticketUrl,
        priceMin: null,
        priceMax: null,
        imageUrl: null,
      };
    });
  } catch (err) {
    console.error("[BIT] fetch error:", err);
    return [];
  }
}

// ── Merge + deduplicate by date+venue ─────────────────────────────────────────
function merge(a: ShowResult[], b: ShowResult[]): ShowResult[] {
  const seen = new Set<string>();
  const result: ShowResult[] = [];

  for (const show of [...a, ...b]) {
    const key = `${show.date ?? ""}|${(show.venue ?? "").toLowerCase().slice(0, 20)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(show);
    }
  }

  return result.sort((x, y) => (x.date ?? "").localeCompare(y.date ?? ""));
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bandName, city: bodyCity } = await req.json();
  if (!bandName) {
    return NextResponse.json({ error: "bandName required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Use caller-supplied city if provided, otherwise fall back to user's saved city
  const rawCity = bodyCity ?? user.city;
  const cityName = rawCity.split(",")[0].trim();

  const [tm, bit] = await Promise.all([
    fetchTicketmaster(bandName, cityName),
    fetchBandsintown(bandName, cityName),
  ]);

  return NextResponse.json({ events: merge(tm, bit) });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface TMEvent {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { localDate?: string; localTime?: string } };
  images?: { url: string; ratio: string; width: number }[];
  priceRanges?: { min?: number; max?: number }[];
  _embedded?: {
    venues?: { name?: string; city?: { name?: string }; stateCode?: string }[];
  };
}

interface BITEvent {
  id: string;
  datetime?: string;
  lineup?: string[];
  venue?: { name?: string; city?: string; region?: string };
  offers?: { url?: string }[];
}
