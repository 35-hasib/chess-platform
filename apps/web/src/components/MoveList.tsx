"use client";

import { useEffect, useRef } from "react";

interface Props {
  moves: string[];
  // Index into moves of the currently-viewed ply (for review), or null = latest.
  currentPly?: number | null;
  onSelectPly?: (ply: number) => void;
}

/** Renders SAN moves in paired rows (white / black). */
export function MoveList({ moves, currentPly = null, onSelectPly }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the latest move in view by scrolling *inside* the list only.
  // scrollIntoView() would scroll the whole page (on mobile the list sits
  // below the board), making the screen jump down after every move.
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [moves.length]);

  const rows: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      num: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const cell = (san: string | undefined, ply: number) => {
    if (!san) return <span />;
    const selected = currentPly === ply;
    return (
      <button
        onClick={() => onSelectPly?.(ply)}
        className={`text-left px-2 py-0.5 rounded hover:bg-panel-lighter transition ${
          selected ? "bg-brand text-white" : ""
        } ${onSelectPly ? "cursor-pointer" : "cursor-default"}`}
      >
        {san}
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      className="bg-panel rounded-md overflow-y-auto scroll-thin max-h-64 text-sm"
    >
      {rows.length === 0 ? (
        <p className="text-gray-500 text-center py-4 text-xs">No moves yet</p>
      ) : (
        rows.map((r, i) => (
          <div
            key={r.num}
            className={`grid grid-cols-[2rem_1fr_1fr] gap-1 px-2 py-0.5 ${
              i % 2 ? "bg-white/[0.02]" : ""
            }`}
          >
            <span className="text-gray-500 self-center">{r.num}.</span>
            {cell(r.white, i * 2)}
            {cell(r.black, i * 2 + 1)}
          </div>
        ))
      )}
    </div>
  );
}
