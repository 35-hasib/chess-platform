/** Format milliseconds as a chess clock: M:SS, or with tenths under 10s. */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = clamped / 1000;
  if (totalSeconds < 10) {
    return totalSeconds.toFixed(1);
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Human label for a time control, e.g. "5+3" or "3 min". */
export function timeControlLabel(initialTime: number, increment: number): string {
  const minutes = initialTime / 60;
  const base = Number.isInteger(minutes) ? `${minutes}` : minutes.toFixed(1);
  return increment > 0 ? `${base}+${increment}` : `${base} min`;
}

/** Category by base minutes. */
export function timeCategory(initialTime: number): string {
  const m = initialTime / 60;
  if (m < 3) return "Bullet";
  if (m < 10) return "Blitz";
  if (m < 30) return "Rapid";
  return "Classical";
}
