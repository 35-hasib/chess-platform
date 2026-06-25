"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Player {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .leaderboard()
      .then((res) => setPlayers(res.players))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">🏆 Leaderboard</h1>
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel text-gray-400 text-left">
              <tr>
                <th className="px-4 py-2 w-12">#</th>
                <th className="px-4 py-2">Player</th>
                <th className="px-4 py-2 text-right">Rating</th>
                <th className="px-4 py-2 text-right">W / L / D</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-t border-panel-lighter hover:bg-panel-lighter/40"
                >
                  <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/profile/${p.username}`}
                      className="font-medium hover:text-brand"
                    >
                      {p.username}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right font-bold">{p.rating}</td>
                  <td className="px-4 py-2 text-right text-gray-400">
                    {p.wins} / {p.losses} / {p.draws}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
