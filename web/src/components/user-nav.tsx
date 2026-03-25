"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function UserNav() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  if (!session) {
    return (
      <Link
        href="/login"
        className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      {isAdmin && (
        <Link
          href="/upload"
          className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Upload
        </Link>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign out
      </button>
    </>
  );
}
