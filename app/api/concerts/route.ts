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

  const concert = await prisma.concert.create({
    data: {
      userId: session.user.id,
      bandName,
      date,
      venue: venue ?? null,
      city: city ?? null,
      startTime: startTime ?? null,
      ticketUrl: ticketUrl ?? null,
      priceMin: priceMin ?? null,
      priceMax: priceMax ?? null,
      imageUrl: imageUrl ?? null,
      status: status ?? "INTERESTED",
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
