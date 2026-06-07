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

interface FetchResult {
  events: ShowResult[];
  error?: string;
}

// ── Ticketmaster ──────────────────────────────────────────────────────────────
async function fetchTicketmaster(bandName: string, cityName: string): Promise<FetchResult> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return { events: [], error: "TICKETMASTER_API_KEY not configured" };

  const now = new Date();
  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  const url =
    `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${apiKey}` +
    `&keyword=${encodeURIComponent(bandName)}` +
    `&startDateTime=${now.toISOString().split(".")[0]}Z` +
    `&endDateTime=${oneYear.toISOString().split(".")[0]}Z` +
    `&classificationName=music&size=20&sort=date,asc`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (data?.fault) {
      const msg = data.fault.faultstring ?? "Unknown Ticketmaster error";
      console.error("[TM] fault:", msg);
      return { events: [], error: `Ticketmaster: ${msg}` };
    }
    if (data?.errors?.length) {
      const msg = data.errors[0]?.detail ?? data.errors[0]?.status ?? "Unknown error";
      console.error("[TM] error:", msg);
      return { events: [], error: `Ticketmaster: ${msg}` };
    }
    if (!res.ok) {
      return { events: [], error: `Ticketmaster: HTTP ${res.status}` };
    }

    const events: TMEvent[] = data?._embedded?.events ?? [];
    console.log(`[TM] "${bandName}" → ${events.length} events`);

    const cityLower = cityName.toLowerCase();
    events.sort((a, b) => {
      const aCity = (a._embedded?.venues?.[0]?.city?.name ?? "").toLowerCase();
      const bCity = (b._embedded?.venues?.[0]?.city?.name ?? "").toLowerCase();
      const aMatch = aCity.includes(cityLower) ? 0 : 1;
      const bMatch = bCity.includes(cityLower) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return (a.dates?.start?.localDate ?? "").localeCompare(b.dates?.start?.localDate ?? "");
    });

    return {
      events: events.slice(0, 10).map((e) => {
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
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[TM] fetch error:", msg);
    return { events: [], error: `Ticketmaster: ${msg}` };
  }
}

// ── SeatGeek ──────────────────────────────────────────────────────────────────
async function fetchSeatGeek(bandName: string, cityName: string): Promise<FetchResult> {
  // SeatGeek slugifies artist names: lowercase, spaces → hyphens, strip punctuation
  const slug = bandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const cityParam = encodeURIComponent(cityName);

  const url =
    `https://api.seatgeek.com/2/events` +
    `?performers.slug=${encodeURIComponent(slug)}` +
    `&venue.city=${cityParam}` +
    `&type=concert&per_page=10&sort=datetime_local.asc`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok) {
      // SeatGeek requires a client_id — surface that clearly
      const msg = data?.message ?? data?.error ?? `HTTP ${res.status}`;
      console.error("[SG] error:", msg);
      return { events: [], error: `SeatGeek: ${msg}` };
    }

    const sgevents: SGEvent[] = data?.events ?? [];
    console.log(`[SG] "${bandName}" → ${sgevents.length} events`);

    return {
      events: sgevents.map((e) => {
        const venue = e.venue;
        const performer = e.performers?.find((p) => p.slug === slug) ?? e.performers?.[0];
        const dt = e.datetime_local ? new Date(e.datetime_local) : null;
        const date = dt ? e.datetime_local.slice(0, 10) : null;
        const startTime = dt
          ? `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`
          : null;
        return {
          externalId: `sg-${e.id}`,
          source: "SeatGeek",
          bandName: performer?.name ?? bandName,
          date,
          venue: venue?.name ?? null,
          city: venue ? `${venue.city}${venue.state ? ", " + venue.state : ""}` : null,
          startTime,
          ticketUrl: e.url ?? null,
          priceMin: e.stats?.lowest_price ?? null,
          priceMax: e.stats?.highest_price ?? null,
          imageUrl: performer?.image ?? null,
        };
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SG] fetch error:", msg);
    return { events: [], error: `SeatGeek: ${msg}` };
  }
}

// ── Merge + deduplicate by date+venue ─────────────────────────────────────────
function merge(a: ShowResult[], b: ShowResult[]): ShowResult[] {
  const seen = new Set<string>();
  const result: ShowResult[] = [];
  for (const show of [...a, ...b]) {
    const key = `${show.date ?? ""}|${(show.venue ?? "").toLowerCase().slice(0, 20)}`;
    if (!seen.has(key)) { seen.add(key); result.push(show); }
  }
  return result.sort((x, y) => (x.date ?? "").localeCompare(y.date ?? ""));
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bandName, city: bodyCity } = await req.json();
  if (!bandName) return NextResponse.json({ error: "bandName required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const rawCity = bodyCity ?? user.city;
  const cityName = rawCity.split(",")[0].trim();

  const [tm, sg] = await Promise.all([
    fetchTicketmaster(bandName, cityName),
    fetchSeatGeek(bandName, cityName),
  ]);

  const apiErrors = [tm.error, sg.error].filter(Boolean);

  return NextResponse.json({
    events: merge(tm.events, sg.events),
    apiErrors: apiErrors.length ? apiErrors : undefined,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface TMEvent {
  id: string; name: string; url?: string;
  dates?: { start?: { localDate?: string; localTime?: string } };
  images?: { url: string; ratio: string; width: number }[];
  priceRanges?: { min?: number; max?: number }[];
  _embedded?: { venues?: { name?: string; city?: { name?: string }; stateCode?: string }[] };
}

interface SGEvent {
  id: number; url?: string; datetime_local: string;
  performers?: { name: string; slug: string; image?: string }[];
  venue?: { name?: string; city?: string; state?: string };
  stats?: { lowest_price?: number; highest_price?: number };
}
