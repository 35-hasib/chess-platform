// Mirror of apps/server/src/game/types.ts (client-side copy).

export type Color = "w" | "b";

export interface TimeControl {
  initialTime: number;
  increment: number;
}

export interface PlayerInfo {
  userId: string;
  username: string;
  rating: number;
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  activeColor: Color | null;
  updatedAt: number;
}

export interface GameSnapshot {
  id: string;
  white: PlayerInfo | null;
  black: PlayerInfo | null;
  fen: string;
  moves: string[];
  turn: Color;
  timeControl: TimeControl;
  clock: ClockState;
  status: "ACTIVE" | "FINISHED" | "ABORTED";
  result: "WHITE_WIN" | "BLACK_WIN" | "DRAW" | null;
  endReason: string | null;
  drawOfferBy: Color | null;
  yourColor: Color | null;
}

export interface MoveResult {
  from: string;
  to: string;
  san: string;
  color: Color;
}

export interface GameOverPayload {
  result: "WHITE_WIN" | "BLACK_WIN" | "DRAW";
  reason: string;
  ratings?: {
    whiteBefore: number;
    blackBefore: number;
    whiteAfter: number;
    blackAfter: number;
  };
}

export interface ChatMessage {
  username: string;
  text: string;
  ts: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}
