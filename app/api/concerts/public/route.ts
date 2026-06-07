import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { shareToken: token },
    select: { id: true, name: true, city: true, shareToken: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const concerts = await prisma.concert.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ user, concerts });
}
