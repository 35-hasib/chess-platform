"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 bg-panel-light border-b border-black/30 px-3 sm:px-4 flex items-center justify-between gap-2">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-base sm:text-lg shrink-0"
      >
        <span className="text-xl sm:text-2xl">♟</span>
        <span>
          <span className="text-brand">Chess</span>Platform
        </span>
      </Link>

      <nav className="flex items-center gap-3 sm:gap-4 text-sm min-w-0">
        <Link href="/" className="hover:text-brand transition">
          Play
        </Link>
        <Link
          href="/leaderboard"
          className="hover:text-brand transition hidden xs:inline"
        >
          Leaderboard
        </Link>
        {user ? (
          <>
            <Link
              href={`/profile/${user.username}`}
              className="hover:text-brand transition truncate max-w-[8rem] sm:max-w-none"
            >
              {user.username}{" "}
              <span className="text-gray-400">({user.rating})</span>
            </Link>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-400 transition shrink-0"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-brand transition">
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded font-semibold transition shrink-0"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
