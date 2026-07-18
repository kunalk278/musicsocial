import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/lib/mobileAuth";

export async function POST(req: NextRequest) {
  const { name, email, password, city } = await req.json();
  if (!name || !email || !password || !city)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hashed, name, city } });
  const token = await signMobileToken({ id: user.id, email: user.email, shareToken: user.shareToken });
  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email, city: user.city, shareToken: user.shareToken } });
}
