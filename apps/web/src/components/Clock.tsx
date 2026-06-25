"use client";

import { useEffect, useState } from "react";
import type { ClockState, Color } from "@/lib/types";
import { formatClock } from "@/lib/format";

interface Props {
  clock: ClockState;
  color: Color;
  active: boolean; // is the game live and this clock's turn
}

/** A self-ticking chess clock that interpolates from the server snapshot. */
export function Clock({ clock, color, active }: Props) {
  const baseMs = color === "w" ? clock.whiteMs : clock.blackMs;
  const isRunning = active && clock.activeColor === color;
  const [display, setDisplay] = useState(baseMs);

  useEffect(() => {
    if (!isRunning) {
      setDisplay(baseMs);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - clock.updatedAt;
      setDisplay(Math.max(0, baseMs - elapsed));
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [isRunning, baseMs, clock.updatedAt]);

  const low = display < 20000;

  return (
    <div
      className={`px-4 py-2 rounded-md font-mono text-2xl font-bold tabular-nums transition-colors ${
        isRunning
          ? low
            ? "bg-red-600 text-white"
            : "bg-brand text-white"
          : "bg-panel-light text-gray-300"
      }`}
    >
      {formatClock(display)}
    </div>
  );
}
