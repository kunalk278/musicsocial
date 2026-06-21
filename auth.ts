import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Spotify from "next-auth/providers/spotify";
import Instagram from "next-auth/providers/instagram";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          shareToken: user.shareToken,
        };
      },
    }),
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    }),
    Instagram({
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.type === "oauth" && user?.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (existing?.password) {
          // Credentials account exists with this email — require password confirmation
          return `/link-account?email=${encodeURIComponent(user.email)}&provider=${account.provider}`;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.type === "oauth" && user) {
        // Instagram doesn't return email — use provider ID as a stable identifier
        const email = user.email ?? `${account.providerAccountId}@${account.provider}.oauth`;
        let dbUser = await prisma.user.findUnique({ where: { email } });
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0],
              city: "",
            },
          });
        }
        token.id = dbUser.id;
        token.shareToken = dbUser.shareToken;
      } else if (user) {
        token.id = user.id;
        token.shareToken = (user as { shareToken?: string }).shareToken;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { shareToken?: string }).shareToken =
          token.shareToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  session: { strategy: "jwt" },
});
