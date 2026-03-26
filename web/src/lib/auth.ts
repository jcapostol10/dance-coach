import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const ADMIN_EMAILS = new Set([
  "josecarlo.apostol@gmail.com",
]);

const ADMIN_PASSWORDS: Record<string, { password: string; name: string }> = {
  "josecarlo.apostol@gmail.com": {
    password: process.env.ADMIN_PASSWORD || "dancecoach2025",
    name: "Jose Carlo",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const entry = ADMIN_PASSWORDS[email.toLowerCase()];
        if (!entry || entry.password !== password) return null;

        return {
          id: email,
          email,
          name: entry.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, account }) {
      if (user?.email) {
        token.role = ADMIN_EMAILS.has(user.email.toLowerCase()) ? "admin" : "user";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
