import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of auth config — no Prisma, no bcrypt.
// Used by middleware.ts (Edge Runtime). auth.ts imports this and adds providers + DB callbacks.
export default {
  providers: [],
  pages: { signIn: "/signin" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
