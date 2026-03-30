"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function UserNav() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const linkClass =
    "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground active:bg-accent/80";

  if (!session) {
    return (
      <Link href="/login" className={linkClass}>
        Sign in
      </Link>
    );
  }

  return (
    <>
      {isAdmin && (
        <Link href="/upload" className={linkClass}>
          Upload
        </Link>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className={linkClass}
      >
        Sign out
      </button>
    </>
  );
}
