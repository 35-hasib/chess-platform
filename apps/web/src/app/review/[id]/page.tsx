"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Chess } from "chess.js";
import { api } from "@/lib/api";
import { Board } from "@/components/Board";
import { MoveList } from "@/components/MoveList";
import { timeControlLabel } from "@/lib/format";

interface GameData {
  id: string;
  pgnMoves: string;
  result: string | null;
  endReason: string | null;
  status: string;
  initialTime: number;
  increment: number;
  white: { username: string; rating: number } | null;
  black: { username: string; rating: number } | null;
}

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<GameData | null>(null);
  const [error, setError] = useState("");
  const [viewIndex, setViewIndex] = useState(0); // 0 = start, n = after move n
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    api
      .game(id)
      .then((res) => {
        setGame(res.game);
        const n = (res.game.pgnMoves || "")
          .split(" ")
          .filter(Boolean).length;
        setViewIndex(n);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // Replay all moves to build a list of positions + last-move highlights.
  const { fens, lastMoves, sanMoves } = useMemo(() => {
    const fens: string[] = [START_FEN];
    const lastMoves: ({ from: string; to: string } | null)[] = [null];
    const sanMoves: string[] = [];
    if (!game) return { fens, lastMoves, sanMoves };
    const chess = new Chess();
    const moves = (game.pgnMoves || "").split(" ").filter(Boolean);
    for (const san of moves) {
      try {
        const m = chess.move(san);
        if (!m) break;
        sanMoves.push(m.san);
        fens.push(chess.fen());
        lastMoves.push({ from: m.from, to: m.to });
      } catch {
        break;
      }
    }
    return { fens, lastMoves, sanMoves };
  }, [game]);

  const maxIndex = fens.length - 1;
  const go = useCallback(
    (i: number) => setViewIndex(Math.max(0, Math.min(maxIndex, i))),
    [maxIndex]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(viewIndex - 1);
      if (e.key === "ArrowRight") go(viewIndex + 1);
      if (e.key === "Home") go(0);
      if (e.key === "End") go(maxIndex);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewIndex, go, maxIndex]);

  if (error)
    return <div className="p-10 text-center text-red-400">{error}</div>;
  if (!game)
    return <div className="p-10 text-center text-gray-400">Loading…</div>;

  let resultText = "Game aborted";
  if (game.result === "WHITE_WIN") resultText = "White won";
  else if (game.result === "BLACK_WIN") resultText = "Black won";
  else if (game.result === "DRAW") resultText = "Draw";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-[auto_340px] gap-6 justify-center">
      <div
        className="w-full mx-auto"
        style={{ width: "min(90vw, calc(100vh - 220px), 560px)" }}
      >
        <div className="flex items-center justify-between bg-panel-light rounded-md px-4 py-2 mb-2">
          <span className="font-semibold">
            {(flip ? game.white : game.black)?.username ?? "—"}
          </span>
          <span className="text-sm text-gray-400">
            {(flip ? game.white : game.black)?.rating ?? ""}
          </span>
        </div>
        <Board
          fen={fens[viewIndex]}
          orientation={flip ? "black" : "white"}
          yourColor={null}
          interactive={false}
          lastMove={lastMoves[viewIndex]}
          onMove={() => {}}
        />
        <div className="flex items-center justify-between bg-panel-light rounded-md px-4 py-2 mt-2">
          <span className="font-semibold">
            {(flip ? game.black : game.white)?.username ?? "—"}
          </span>
          <span className="text-sm text-gray-400">
            {(flip ? game.black : game.white)?.rating ?? ""}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card !p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{resultText}</span>
            <button
              onClick={() => setFlip((f) => !f)}
              className="text-xs btn-secondary py-1 px-2"
            >
              ⇅ Flip
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3 capitalize">
            {timeControlLabel(game.initialTime, game.increment)} •{" "}
            {game.endReason}
          </p>

          <MoveList
            moves={sanMoves}
            currentPly={viewIndex > 0 ? viewIndex - 1 : null}
            onSelectPly={(ply) => go(ply + 1)}
          />

          <div className="flex justify-center gap-2 mt-3">
            <NavBtn onClick={() => go(0)}>⏮</NavBtn>
            <NavBtn onClick={() => go(viewIndex - 1)}>◀</NavBtn>
            <NavBtn onClick={() => go(viewIndex + 1)}>▶</NavBtn>
            <NavBtn onClick={() => go(maxIndex)}>⏭</NavBtn>
          </div>
        </div>

        <Link href="/" className="btn-primary w-full block text-center">
          New game
        </Link>
      </div>
    </div>
  );
}

function NavBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-panel-lighter hover:bg-panel-light w-12 h-9 rounded-md text-sm"
    >
      {children}
    </button>
  );
}
