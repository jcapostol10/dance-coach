import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const ADMIN_USERS: Record<string, { password: string; name: string; role: string }> = {
  "josecarlo.apostol@gmail.com": {
    password: process.env.ADMIN_PASSWORD || "dancecoach2025",
    name: "Jose Carlo",
    role: "admin",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
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

        const user = ADMIN_USERS[email.toLowerCase()];
        if (!user || user.password !== password) return null;

        return {
          id: email,
          email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || "user";
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
