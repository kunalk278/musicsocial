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

  const tm = await fetchTicketmaster(bandName, cityName);

  return NextResponse.json({
    events: tm.events,
    apiErrors: tm.error ? [tm.error] : undefined,
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

