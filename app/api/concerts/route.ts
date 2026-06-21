import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const concerts = await prisma.concert.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(concerts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bandName, date, venue, city, startTime, ticketUrl, priceMin, priceMax, imageUrl, status, externalId } = body;

  if (!bandName || !date) {
    return NextResponse.json({ error: "bandName and date required" }, { status: 400 });
  }

  function safeUrl(value: unknown): string | null {
    if (!value || typeof value !== "string") return null;
    try {
      const u = new URL(value);
      return u.protocol === "https:" || u.protocol === "http:" ? value : null;
    } catch {
      return null;
    }
  }

  const concert = await prisma.concert.create({
    data: {
      userId: session.user.id,
      bandName: String(bandName).slice(0, 200),
      date,
      venue: venue ? String(venue).slice(0, 200) : null,
      city: city ? String(city).slice(0, 100) : null,
      startTime: startTime ?? null,
      ticketUrl: safeUrl(ticketUrl),
      priceMin: priceMin ?? null,
      priceMax: priceMax ?? null,
      imageUrl: safeUrl(imageUrl),
      status: ["INTERESTED", "ATTENDING"].includes(status) ? status : "INTERESTED",
      externalId: externalId ?? null,
    },
  });

  return NextResponse.json(concert, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const concert = await prisma.concert.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!concert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.concert.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
