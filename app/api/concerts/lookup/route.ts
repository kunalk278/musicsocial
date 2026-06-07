import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bandName } = await req.json();
  if (!bandName) {
    return NextResponse.json({ error: "bandName required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const apiKey = process.env.TICKETMASTER_API_KEY;
  const city = encodeURIComponent(user.city);
  const keyword = encodeURIComponent(bandName);

  const now = new Date();
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  const startDateTime = now.toISOString().split(".")[0] + "Z";
  const endDateTime = sixMonths.toISOString().split(".")[0] + "Z";

  const url =
    `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${apiKey}` +
    `&keyword=${keyword}` +
    `&city=${city}` +
    `&startDateTime=${startDateTime}` +
    `&endDateTime=${endDateTime}` +
    `&classificationName=music` +
    `&size=10` +
    `&sort=date,asc`;

  let events: TMEvent[] = [];
  try {
    const res = await fetch(url);
    const data = await res.json();
    events = data?._embedded?.events ?? [];
  } catch {
    return NextResponse.json({ events: [] });
  }

  const results = events.map((e: TMEvent) => {
    const venue = e._embedded?.venues?.[0];
    const priceRange = e.priceRanges?.[0];
    const image = e.images?.find((i: TMImage) => i.ratio === "16_9" && i.width > 500) ?? e.images?.[0];

    return {
      externalId: e.id,
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

  return NextResponse.json({ events: results });
}

interface TMImage {
  url: string;
  ratio: string;
  width: number;
}

interface TMEvent {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { localDate?: string; localTime?: string } };
  images?: TMImage[];
  priceRanges?: { min?: number; max?: number }[];
  _embedded?: {
    venues?: { name?: string; city?: { name?: string }; stateCode?: string }[];
  };
}
