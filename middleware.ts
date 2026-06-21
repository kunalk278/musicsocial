import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PROTECTED_API = /^\/api\/(concerts|follows|feed|me)(\/|$)/;
const PROTECTED_PAGES = /^\/(add|my-concerts|friends|calendar)(\/|$)/;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth?.user;

  if (!isAuthed && PROTECTED_API.test(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAuthed && PROTECTED_PAGES.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/api/(concerts|follows|feed|me)/:path*", "/(add|my-concerts|friends|calendar)/:path*"],
};
