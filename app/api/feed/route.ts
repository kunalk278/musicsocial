import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/mobileAuth";

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const follows = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: { followeeId: true, followee: { select: { id: true, name: true, city: true, shareToken: true } } },
  });

  const followeeIds = follows.map((f: { followeeId: string }) => f.followeeId);

  const concerts = await prisma.concert.findMany({
    where: { userId: { in: followeeIds } },
    include: { user: { select: { id: true, name: true, city: true, shareToken: true } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ concerts, friends: follows.map((f: { followee: unknown }) => f.followee) });
}
