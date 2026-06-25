export interface Preset {
  label: string;
  category: "Bullet" | "Blitz" | "Rapid";
  initialTime: number; // seconds
  increment: number; // seconds
}

export const PRESETS: Preset[] = [
  { label: "1 min", category: "Bullet", initialTime: 60, increment: 0 },
  { label: "1 | 1", category: "Bullet", initialTime: 60, increment: 1 },
  { label: "2 | 1", category: "Bullet", initialTime: 120, increment: 1 },
  { label: "3 min", category: "Blitz", initialTime: 180, increment: 0 },
  { label: "3 | 2", category: "Blitz", initialTime: 180, increment: 2 },
  { label: "5 min", category: "Blitz", initialTime: 300, increment: 0 },
  { label: "10 min", category: "Rapid", initialTime: 600, increment: 0 },
  { label: "15 | 10", category: "Rapid", initialTime: 900, increment: 10 },
  { label: "30 min", category: "Rapid", initialTime: 1800, increment: 0 },
];
