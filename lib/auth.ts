import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

const providers: NextAuthOptions["providers"] = [];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

providers.push(
  Credentials({
    name: "Demo Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const email = credentials.email.toLowerCase();
      const password = credentials.password;
      const user = await prisma.user.findUnique({
        where: { email },
      });
      // If no user exists yet, treat this as a first-time signup and create one.
      if (!user) {
        const hashed = await bcrypt.hash(password, 10);
        const created = await prisma.user.create({
          data: {
            email,
            password: hashed,
            name: credentials.email,
          },
        });
        return {
          id: created.id,
          name: created.name || created.email,
          email: created.email,
        };
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return null;
      return {
        id: user.id,
        name: user.name || user.email,
        email: user.email,
      };
    },
  }),
);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
};

export const authHandler = NextAuth(authOptions);
export const getAuthSession = () => getServerSession(authOptions);
