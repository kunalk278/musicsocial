import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { auth } from "@/auth";

const secret = () => new TextEncoder().encode(
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret"
);

export async function signMobileToken(payload: {
  id: string; email: string; shareToken: string;
}) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(secret());
}

export async function verifyMobileToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as { id: string; email: string; shareToken: string };
  } catch {
    return null;
  }
}

// Drop-in replacement for `auth()` in API routes — accepts both cookie sessions
// (web) and Authorization: Bearer tokens (mobile).
export async function getUser(req: NextRequest): Promise<{ id: string } | null> {
  const session = await auth();
  if (session?.user?.id) return { id: session.user.id };

  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const payload = await verifyMobileToken(header.slice(7));
    if (payload?.id) return { id: payload.id };
  }
  return null;
}
