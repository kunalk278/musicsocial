import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/lib/mobileAuth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password)
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const token = await signMobileToken({ id: user.id, email: user.email, shareToken: user.shareToken });
  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email, city: user.city, shareToken: user.shareToken } });
}
