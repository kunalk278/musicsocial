import { NextResponse } from "next/server";

// Temporary debug endpoint — remove before production
export async function GET() {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TICKETMASTER_API_KEY not set" });
  }

  const tmUrl =
    `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${apiKey}&keyword=Yellowcard&classificationName=music&size=3&sort=date,asc`;

  const bitUrl =
    `https://rest.bandsintown.com/artists/Yellowcard/events?app_id=showshare&date=upcoming`;

  const [tmRes, bitRes] = await Promise.all([
    fetch(tmUrl).then((r) => r.json()).catch((e) => ({ fetchError: String(e) })),
    fetch(bitUrl).then((r) => r.json()).catch((e) => ({ fetchError: String(e) })),
  ]);

  return NextResponse.json({
    keyPrefix: apiKey.slice(0, 6) + "...",
    ticketmaster: {
      totalElements: (tmRes as any)?.page?.totalElements,
      firstEvent: (tmRes as any)?._embedded?.events?.[0]?.name,
      errors: (tmRes as any)?.errors ?? (tmRes as any)?.fault ?? null,
      raw: JSON.stringify(tmRes).slice(0, 400),
    },
    bandsintown: {
      count: Array.isArray(bitRes) ? bitRes.length : null,
      firstEvent: Array.isArray(bitRes) ? (bitRes[0] as any)?.venue?.name : null,
      raw: JSON.stringify(bitRes).slice(0, 400),
    },
  });
}
