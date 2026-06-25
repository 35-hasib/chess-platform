"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 bg-panel-light border-b border-black/30 px-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg">
        <span className="text-2xl">♟</span>
        <span className="text-brand">Chess</span>Platform
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-brand transition">
          Play
        </Link>
        <Link href="/leaderboard" className="hover:text-brand transition">
          Leaderboard
        </Link>
        {user ? (
          <>
            <Link
              href={`/profile/${user.username}`}
              className="hover:text-brand transition"
            >
              {user.username}{" "}
              <span className="text-gray-400">({user.rating})</span>
            </Link>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-400 transition"
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
              className="bg-brand hover:bg-brand-dark text-white px-3 py-1.5 rounded font-semibold transition"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
