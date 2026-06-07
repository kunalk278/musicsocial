import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ attractions: [] });

  const apiKey = process.env.TICKETMASTER_API_KEY;
  const url =
    `https://app.ticketmaster.com/discovery/v2/attractions.json` +
    `?apikey=${apiKey}` +
    `&keyword=${encodeURIComponent(q)}` +
    `&classificationName=music` +
    `&size=8`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const attractions = (data?._embedded?.attractions ?? []).map(
      (a: { id: string; name: string; images?: { url: string; width: number }[] }) => ({
        id: a.id,
        name: a.name,
        imageUrl: a.images?.find((i) => i.width >= 100)?.url ?? null,
      })
    );
    return NextResponse.json({ attractions });
  } catch {
    return NextResponse.json({ attractions: [] });
  }
}
