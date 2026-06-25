"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Chess, type Square } from "chess.js";
import type { Color } from "@/lib/types";

// react-chessboard touches window — load client-side only.
const Chessboard = dynamic(
  () => import("react-chessboard").then((m) => m.Chessboard),
  { ssr: false }
);

interface Props {
  fen: string;
  orientation: "white" | "black";
  yourColor: Color | null; // null = spectator / review
  interactive: boolean;
  lastMove?: { from: string; to: string } | null;
  onMove: (from: string, to: string, promotion?: string) => void;
}

const HIGHLIGHT = "rgba(129, 182, 76, 0.45)";
const DOT =
  "radial-gradient(circle, rgba(0,0,0,0.25) 25%, transparent 28%)";
const CAPTURE_DOT =
  "radial-gradient(circle, transparent 55%, rgba(0,0,0,0.25) 56%)";

export function Board({
  fen,
  orientation,
  yourColor,
  interactive,
  lastMove,
  onMove,
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, object>>(
    {}
  );
  const [promotion, setPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const game = useMemo(() => new Chess(fen), [fen]);

  // While a piece is being dragged on a touch device, the browser would
  // otherwise treat the finger movement as a page scroll/pan (the board
  // "scrolls down" mid-move). react-chessboard's touch backend does not call
  // preventDefault, and React's onTouchMove is registered as a passive
  // listener (which can't preventDefault), so we attach a non-passive one
  // directly to the board wrapper and block the default only while dragging.
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current) e.preventDefault();
    };
    const onTouchEnd = () => {
      draggingRef.current = false;
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const turn = game.turn();
  const myTurn = interactive && yourColor === turn;

  function canControl(square: Square): boolean {
    const piece = game.get(square);
    return !!piece && piece.color === turn && myTurn;
  }

  function highlightMoves(square: Square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }
    const styles: Record<string, object> = {};
    for (const m of moves) {
      const target = game.get(m.to as Square);
      styles[m.to] = {
        background: target ? CAPTURE_DOT : DOT,
        borderRadius: target ? undefined : "50%",
      };
    }
    styles[square] = { background: HIGHLIGHT };
    setOptionSquares(styles);
    return true;
  }

  function isPromotion(from: Square, to: Square): boolean {
    return game
      .moves({ square: from, verbose: true })
      .some((m) => m.to === to && m.flags.includes("p"));
  }

  function tryMove(from: Square, to: Square): boolean {
    const legal = game
      .moves({ square: from, verbose: true })
      .some((m) => m.to === to);
    if (!legal) return false;
    if (isPromotion(from, to)) {
      setPromotion({ from, to });
      return false; // wait for piece selection
    }
    onMove(from, to);
    setSelected(null);
    setOptionSquares({});
    return true;
  }

  function onSquareClick(square: Square) {
    if (!myTurn) return;
    if (selected && square !== selected) {
      const moved = tryMove(selected, square);
      if (moved) return;
    }
    if (canControl(square)) {
      setSelected(square);
      highlightMoves(square);
    } else {
      setSelected(null);
      setOptionSquares({});
    }
  }

  function onPieceDrop(from: Square, to: Square): boolean {
    if (!myTurn) return false;
    return tryMove(from, to);
  }

  function choosePromotion(piece: "q" | "r" | "b" | "n") {
    if (!promotion) return;
    onMove(promotion.from, promotion.to, piece);
    setPromotion(null);
    setSelected(null);
    setOptionSquares({});
  }

  const lastMoveStyles: Record<string, object> = {};
  if (lastMove) {
    lastMoveStyles[lastMove.from] = { background: HIGHLIGHT };
    lastMoveStyles[lastMove.to] = { background: HIGHLIGHT };
  }

  return (
    <div ref={wrapRef} className="board-touch relative w-full">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        onPieceDragBegin={() => {
          draggingRef.current = true;
        }}
        onPieceDragEnd={() => {
          draggingRef.current = false;
        }}
        arePiecesDraggable={myTurn}
        customSquareStyles={{ ...lastMoveStyles, ...optionSquares }}
        customBoardStyle={{
          borderRadius: "6px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        }}
        customDarkSquareStyle={{ backgroundColor: "#739552" }}
        customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
      />

      {promotion && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded-md">
          <div className="bg-panel-light p-4 rounded-lg">
            <p className="text-center text-sm mb-3 text-gray-300">
              Promote to:
            </p>
            <div className="flex gap-2">
              {(["q", "r", "b", "n"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => choosePromotion(p)}
                  className="w-14 h-14 bg-panel rounded-md hover:bg-panel-lighter text-3xl flex items-center justify-center"
                >
                  {pieceGlyph(p, yourColor ?? "w")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pieceGlyph(p: "q" | "r" | "b" | "n", color: Color): string {
  const white = { q: "♕", r: "♖", b: "♗", n: "♘" };
  const black = { q: "♛", r: "♜", b: "♝", n: "♞" };
  return color === "w" ? white[p] : black[p];
}
