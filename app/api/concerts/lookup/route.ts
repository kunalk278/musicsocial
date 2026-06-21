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
  error?: string; // only set when a key is configured but the call fails
}

// ── Ticketmaster (also covers Live Nation — same company) ─────────────────────
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
      const msg = data.fault.faultstring ?? "Unknown error";
      console.error("[TM] fault:", msg);
      return { events: [], error: `Ticketmaster: ${msg}` };
    }
    if (data?.errors?.length) {
      const msg = data.errors[0]?.detail ?? data.errors[0]?.status ?? "Unknown error";
      console.error("[TM] error:", msg);
      return { events: [], error: `Ticketmaster: ${msg}` };
    }
    if (!res.ok) return { events: [], error: `Ticketmaster: HTTP ${res.status}` };

    const events: TMEvent[] = data?._embedded?.events ?? [];
    console.log(`[TM] "${bandName}" → ${events.length} events`);

    return {
      events: sortByCity(
        events.slice(0, 15).map((e) => {
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
        cityName,
      ),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[TM] fetch error:", msg);
    return { events: [], error: `Ticketmaster: ${msg}` };
  }
}

// ── SeatGeek ──────────────────────────────────────────────────────────────────
// Free client_id: https://seatgeek.com/account/develop
async function fetchSeatGeek(bandName: string, cityName: string): Promise<FetchResult> {
  const clientId = process.env.SEATGEEK_CLIENT_ID;
  if (!clientId) return { events: [] }; // silently skip — not required

  const url =
    `https://api.seatgeek.com/2/events` +
    `?q=${encodeURIComponent(bandName)}` +
    `&venue.city=${encodeURIComponent(cityName)}` +
    `&type=concert&per_page=15&sort=datetime_local.asc` +
    `&client_id=${clientId}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.message ?? `HTTP ${res.status}`;
      console.error("[SG] error:", msg);
      return { events: [], error: `SeatGeek: ${msg}` };
    }

    const events: SGEvent[] = data?.events ?? [];
    console.log(`[SG] "${bandName}" → ${events.length} events`);

    return {
      events: events.map((e) => {
        const performer = e.performers?.[0];
        const dt = e.datetime_local ? new Date(e.datetime_local) : null;
        return {
          externalId: `sg-${e.id}`,
          source: "SeatGeek",
          bandName: performer?.name ?? bandName,
          date: e.datetime_local ? e.datetime_local.slice(0, 10) : null,
          venue: e.venue?.name ?? null,
          city: e.venue ? `${e.venue.city}${e.venue.state ? ", " + e.venue.state : ""}` : null,
          startTime: dt
            ? `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`
            : null,
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

// ── Eventbrite ────────────────────────────────────────────────────────────────
// Free private token: https://www.eventbrite.com/platform/api-keys
async function fetchEventbrite(bandName: string, cityName: string): Promise<FetchResult> {
  const token = process.env.EVENTBRITE_TOKEN;
  if (!token) return { events: [] }; // silently skip — not required

  const now = new Date().toISOString();
  const url =
    `https://www.eventbriteapi.com/v3/events/search/` +
    `?q=${encodeURIComponent(bandName)}` +
    `&location.address=${encodeURIComponent(cityName)}` +
    `&location.within=30mi` +
    `&categories=103` + // music
    `&start_date.range_start=${now}` +
    `&sort_by=date` +
    `&expand=venue,ticket_availability` +
    `&page_size=15`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error_description ?? data?.error ?? `HTTP ${res.status}`;
      console.error("[EB] error:", msg);
      return { events: [], error: `Eventbrite: ${msg}` };
    }

    const events: EBEvent[] = data?.events ?? [];
    console.log(`[EB] "${bandName}" → ${events.length} events`);

    return {
      events: events.map((e) => {
        const localStart = e.start?.local ?? null;
        const dt = localStart ? new Date(localStart) : null;
        return {
          externalId: `eb-${e.id}`,
          source: "Eventbrite",
          bandName: e.name?.text ?? bandName,
          date: localStart ? localStart.slice(0, 10) : null,
          venue: e.venue?.name ?? null,
          city: e.venue?.address
            ? `${e.venue.address.city ?? ""}${e.venue.address.region ? ", " + e.venue.address.region : ""}`
            : null,
          startTime: dt
            ? `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`
            : null,
          ticketUrl: e.url ?? null,
          priceMin: e.ticket_availability?.minimum_ticket_price?.value ?? null,
          priceMax: e.ticket_availability?.maximum_ticket_price?.value ?? null,
          imageUrl: e.logo?.url ?? null,
        };
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[EB] fetch error:", msg);
    return { events: [], error: `Eventbrite: ${msg}` };
  }
}

// ── Resident Advisor (unofficial GraphQL — covers indie/electronic venues) ─────
// No key required. Covers venues like Elsewhere, Nowadays, Pacha, Output, etc.
const RA_AREA_IDS: Record<string, number> = {
  "new york": 13, "los angeles": 9, "chicago": 24, "san francisco": 25,
  "miami": 67, "seattle": 71, "austin": 73, "washington": 52, "boston": 26,
  "atlanta": 68, "denver": 74, "portland": 75, "nashville": 76,
  "philadelphia": 77, "dallas": 78, "houston": 79, "las vegas": 80,
  "minneapolis": 81, "detroit": 82, "new orleans": 83, "phoenix": 84,
};

const RA_QUERY = `
  query GetEventListings($filters: FilterInputDtoInput, $pageSize: Int) {
    eventListings(
      filters: $filters
      pageSize: $pageSize
      page: 1
      sort: { listingDate: { priority: 1, order: ASC } }
    ) {
      data {
        id
        event {
          id
          title
          date
          startTime
          contentUrl
          images { filename type }
          venue {
            id
            name
            address
            city { name }
          }
          artists { id name }
          tickets { price url isAvailable }
        }
      }
      totalResults
    }
  }
`;

async function fetchResidentAdvisor(bandName: string, cityName: string): Promise<FetchResult> {
  const now = new Date();
  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  const areaId = RA_AREA_IDS[cityName.toLowerCase()];

  const filters: Record<string, unknown> = {
    listingDate: {
      gte: now.toISOString().split("T")[0],
      lte: oneYear.toISOString().split("T")[0],
    },
    event: { title: { ilike: `%${bandName}%` } },
  };
  if (areaId) filters.areas = { eq: areaId };

  try {
    const res = await fetch("https://ra.co/graphql", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://ra.co/",
        "User-Agent": "Mozilla/5.0 (compatible; bandwagon/1.0)",
        "ra-content-language": "en",
      },
      body: JSON.stringify({
        operationName: "GetEventListings",
        query: RA_QUERY,
        variables: { filters, pageSize: 15 },
      }),
    });

    if (!res.ok) {
      console.error(`[RA] HTTP ${res.status}`);
      return { events: [], error: `Resident Advisor: HTTP ${res.status}` };
    }

    const json = await res.json();
    if (json.errors?.length) {
      const msg = json.errors[0]?.message ?? "GraphQL error";
      console.error("[RA] GraphQL error:", msg);
      return { events: [], error: `Resident Advisor: ${msg}` };
    }

    const listings: RAListing[] = json.data?.eventListings?.data ?? [];
    console.log(`[RA] "${bandName}" → ${listings.length} events`);

    return {
      events: listings
        .filter((l) => l.event)
        .map((l) => {
          const e = l.event!;
          const ticket = e.tickets?.find((t) => t.isAvailable) ?? e.tickets?.[0];
          const image = e.images?.find((i) => i.type === "flyer") ?? e.images?.[0];
          const imageUrl = image?.filename
            ? (image.filename.startsWith("http") ? image.filename : `https://ra.co/images/${image.filename}`)
            : null;

          // startTime from RA is a full ISO datetime; extract HH:MM
          let startTime: string | null = null;
          if (e.startTime) {
            const t = new Date(e.startTime);
            if (!isNaN(t.getTime())) {
              startTime = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
            }
          }

          return {
            externalId: `ra-${l.id}`,
            source: "Resident Advisor",
            bandName: e.title ?? bandName,
            date: e.date ?? null,
            venue: e.venue?.name ?? null,
            city: e.venue?.city?.name ?? null,
            startTime,
            ticketUrl: ticket?.url ?? (e.contentUrl ? `https://ra.co${e.contentUrl}` : null),
            priceMin: ticket?.price ?? null,
            priceMax: null,
            imageUrl,
          };
        }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[RA] fetch error:", msg);
    return { events: [], error: `Resident Advisor: ${msg}` };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sortByCity(events: ShowResult[], cityName: string): ShowResult[] {
  const cityLower = cityName.toLowerCase();
  return [...events].sort((a, b) => {
    const aMatch = (a.city ?? "").toLowerCase().includes(cityLower) ? 0 : 1;
    const bMatch = (b.city ?? "").toLowerCase().includes(cityLower) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return (a.date ?? "").localeCompare(b.date ?? "");
  });
}

function mergeAll(sources: ShowResult[][]): ShowResult[] {
  const seen = new Set<string>();
  const result: ShowResult[] = [];
  for (const show of sources.flat()) {
    const key = `${show.date ?? ""}|${(show.venue ?? "").toLowerCase().replace(/\s+/g, "").slice(0, 20)}`;
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

  const [tm, sg, eb, ra] = await Promise.all([
    fetchTicketmaster(bandName, cityName),
    fetchSeatGeek(bandName, cityName),
    fetchEventbrite(bandName, cityName),
    fetchResidentAdvisor(bandName, cityName),
  ]);

  // Log full errors server-side; only surface a generic message to the client
  const rawErrors = [tm.error, sg.error, eb.error, ra.error].filter(Boolean);
  if (rawErrors.length) console.error("[lookup] source errors:", rawErrors);
  const apiErrors = rawErrors.map((e) => {
    const source = (e as string).split(":")[0]; // e.g. "Ticketmaster"
    return `${source}: service temporarily unavailable`;
  });

  return NextResponse.json({
    events: mergeAll([tm.events, sg.events, eb.events, ra.events]),
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

interface EBEvent {
  id: string; url?: string;
  name?: { text?: string };
  start?: { local?: string };
  logo?: { url?: string };
  venue?: { name?: string; address?: { city?: string; region?: string } };
  ticket_availability?: {
    minimum_ticket_price?: { value?: number };
    maximum_ticket_price?: { value?: number };
  };
}

interface RAListing {
  id: string;
  event?: RAEvent;
}

interface RAEvent {
  id: string;
  title?: string;
  date?: string;
  startTime?: string;
  contentUrl?: string;
  images?: { filename?: string; type?: string }[];
  venue?: { id?: string; name?: string; address?: string; city?: { name?: string } };
  artists?: { id?: string; name?: string }[];
  tickets?: { price?: number; url?: string; isAvailable?: boolean }[];
}
