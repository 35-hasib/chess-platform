"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { PRESETS, type Preset } from "@/lib/timeControls";
import type { GameSnapshot } from "@/lib/types";

type Mode = "idle" | "searching" | "waitingPrivate";

export default function LobbyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [selected, setSelected] = useState<Preset | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState("");

  // Wire socket lifecycle: navigate to the game once it starts.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const onStart = (snap: GameSnapshot) => {
      router.push(`/game/${snap.id}`);
    };
    const onError = (msg: string) => setError(msg);

    socket.on("game:start", onStart);
    socket.on("error", onError);

    return () => {
      socket.off("game:start", onStart);
      socket.off("error", onError);
    };
  }, [user, router]);

  function play(preset: Preset) {
    setError("");
    setSelected(preset);
    setMode("searching");
    const socket = getSocket();
    socket.emit("queue:join", {
      initialTime: preset.initialTime,
      increment: preset.increment,
    });
  }

  function cancelSearch() {
    getSocket().emit("queue:leave");
    setMode("idle");
    setSelected(null);
  }

  function createPrivate(preset: Preset) {
    setError("");
    setSelected(preset);
    const socket = getSocket();
    socket.emit(
      "game:create",
      {
        tc: { initialTime: preset.initialTime, increment: preset.increment },
        color: "random",
      },
      (res: { gameId: string } | { error: string }) => {
        if ("error" in res) {
          setError(res.error);
          return;
        }
        // Enter our own room and wait for an opponent.
        socket.emit("game:join", res.gameId);
        setInviteLink(`${window.location.origin}/game/${res.gameId}`);
        setMode("waitingPrivate");
      }
    );
  }

  function joinPrivate() {
    const id = joinId.trim();
    if (id) router.push(`/game/${id}`);
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Play Chess Online <span className="text-brand">in Real Time</span>
        </h1>
        <p className="text-gray-400 mb-8">
          Matchmaking, ratings, clocks, and full chess rules. Log in to start
          playing.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/register" className="btn-primary">
            Create account
          </Link>
          <Link href="/login" className="btn-secondary">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {mode === "searching" && selected && (
        <Searching label={selected.label} onCancel={cancelSearch} />
      )}

      {mode === "waitingPrivate" && (
        <WaitingPrivate
          link={inviteLink}
          onCancel={() => {
            setMode("idle");
            setInviteLink("");
          }}
        />
      )}

      {mode === "idle" && (
        <>
          <h1 className="text-2xl font-bold mb-6">New Game</h1>
          {error && (
            <p className="text-red-400 text-sm mb-4 bg-red-500/10 px-3 py-2 rounded">
              {error}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3 mb-8">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => play(p)}
                className="bg-panel-light hover:bg-panel-lighter rounded-lg p-4 text-center transition group"
              >
                <div className="text-xs text-gray-400 group-hover:text-brand">
                  {p.category}
                </div>
                <div className="text-xl font-bold">{p.label}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Click to find opponent
                </div>
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold mb-3">Play a friend</h2>
              <p className="text-sm text-gray-400 mb-3">
                Create a private game and share the link.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.slice(0, 6).map((p) => (
                  <button
                    key={p.label}
                    onClick={() => createPrivate(p)}
                    className="btn-secondary text-sm py-1.5"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-3">Join by ID</h2>
              <p className="text-sm text-gray-400 mb-3">
                Paste a game ID or link from a friend.
              </p>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Game ID"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                />
                <button onClick={joinPrivate} className="btn-primary">
                  Join
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Searching({
  label,
  onCancel,
}: {
  label: string;
  onCancel: () => void;
}) {
  return (
    <div className="card text-center py-12">
      <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-1">Finding an opponent…</h2>
      <p className="text-gray-400 mb-6">{label} game</p>
      <button onClick={onCancel} className="btn-secondary">
        Cancel
      </button>
    </div>
  );
}

function WaitingPrivate({
  link,
  onCancel,
}: {
  link: string;
  onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card text-center py-10">
      <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-3">Waiting for your friend…</h2>
      <p className="text-gray-400 text-sm mb-3">Share this link:</p>
      <div className="flex gap-2 max-w-md mx-auto mb-6">
        <input className="input" readOnly value={link} />
        <button
          className="btn-primary whitespace-nowrap"
          onClick={() => {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <button onClick={onCancel} className="btn-secondary">
        Cancel
      </button>
    </div>
  );
}
