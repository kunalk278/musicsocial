import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/mobileAuth";

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const follows = await prisma.follow.findMany({
    where: { followerId: user.id },
    include: { followee: { select: { id: true, name: true, city: true, shareToken: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(follows);
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shareToken } = await req.json();
  if (!shareToken) return NextResponse.json({ error: "shareToken required" }, { status: 400 });

  const followee = await prisma.user.findUnique({ where: { shareToken } });
  if (!followee) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (followee.id === user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId: user.id, followeeId: followee.id } },
  });
  if (existing) return NextResponse.json({ error: "Already following" }, { status: 409 });

  const follow = await prisma.follow.create({
    data: { followerId: user.id, followeeId: followee.id },
    include: { followee: { select: { id: true, name: true, city: true, shareToken: true } } },
  });

  return NextResponse.json(follow, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { followeeId } = await req.json();
  await prisma.follow.deleteMany({ where: { followerId: user.id, followeeId } });
  return NextResponse.json({ success: true });
}
