"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { api } from "@/lib/api";
import { timeControlLabel } from "@/lib/format";

interface Profile {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
}

interface GameRow {
  id: string;
  status: string;
  result: string | null;
  endReason: string | null;
  initialTime: number;
  increment: number;
  finishedAt: string | null;
  white: { username: string; rating: number } | null;
  black: { username: string; rating: number } | null;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<Profile | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .user(username)
      .then((res) => {
        setUser(res.user);
        setGames(res.games);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;
  if (error || !user)
    return <div className="p-10 text-center text-red-400">{error || "Not found"}</div>;

  const total = user.wins + user.losses + user.draws;
  const winRate = total ? Math.round((user.wins / total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="card mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-2xl font-bold text-brand">
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-gray-400 text-sm">
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-brand">{user.rating}</div>
          <div className="text-xs text-gray-400">rating</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Wins" value={user.wins} color="text-green-400" />
        <Stat label="Losses" value={user.losses} color="text-red-400" />
        <Stat label="Draws" value={user.draws} color="text-gray-300" />
        <Stat label="Win %" value={`${winRate}%`} color="text-brand" />
      </div>

      <h2 className="font-semibold mb-3">Recent games</h2>
      {games.length === 0 ? (
        <p className="text-gray-500 text-sm">No games played yet.</p>
      ) : (
        <div className="card !p-0 overflow-hidden">
          {games.map((g) => {
            const isWhite = g.white?.username === user.username;
            const opp = isWhite ? g.black : g.white;
            let outcome = "Draw";
            let cls = "text-gray-400";
            if (g.result === "WHITE_WIN") {
              outcome = isWhite ? "Won" : "Lost";
            } else if (g.result === "BLACK_WIN") {
              outcome = isWhite ? "Lost" : "Won";
            }
            if (outcome === "Won") cls = "text-green-400";
            if (outcome === "Lost") cls = "text-red-400";
            return (
              <Link
                key={g.id}
                href={`/review/${g.id}`}
                className="flex items-center justify-between px-4 py-3 border-t border-panel-lighter first:border-t-0 hover:bg-panel-lighter/40"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-semibold w-12 ${cls}`}>{outcome}</span>
                  <span>
                    vs{" "}
                    <span className="font-medium">
                      {opp?.username ?? "—"}
                    </span>{" "}
                    <span className="text-gray-500 text-sm">
                      ({opp?.rating ?? "?"})
                    </span>
                  </span>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{timeControlLabel(g.initialTime, g.increment)}</div>
                  <div className="capitalize">{g.endReason}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="card !p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
