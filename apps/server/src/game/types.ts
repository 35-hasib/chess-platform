// Shared socket payload types. The web client mirrors these in apps/web/src/lib/types.ts.

export type Color = "w" | "b";

export interface TimeControl {
  initialTime: number; // seconds
  increment: number; // seconds per move
}

export interface PlayerInfo {
  userId: string;
  username: string;
  rating: number;
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  // The color whose clock is currently running (null before first move / after game end)
  activeColor: Color | null;
  // Server timestamp (ms) when the active clock last started — lets clients interpolate.
  updatedAt: number;
}

export interface GameSnapshot {
  id: string;
  white: PlayerInfo | null;
  black: PlayerInfo | null;
  fen: string;
  moves: string[]; // SAN
  turn: Color;
  timeControl: TimeControl;
  clock: ClockState;
  status: "ACTIVE" | "FINISHED" | "ABORTED";
  result: "WHITE_WIN" | "BLACK_WIN" | "DRAW" | null;
  endReason: string | null;
  drawOfferBy: Color | null;
  // Your color in this game, or null if spectating
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

// ---- Client -> Server events ----
export interface ClientToServerEvents {
  "queue:join": (tc: TimeControl) => void;
  "queue:leave": () => void;
  "game:create": (
    payload: { tc: TimeControl; color: Color | "random" },
    ack: (res: { gameId: string } | { error: string }) => void
  ) => void;
  "game:join": (gameId: string) => void;
  "game:leave": (gameId: string) => void;
  move: (payload: {
    gameId: string;
    from: string;
    to: string;
    promotion?: string;
  }) => void;
  resign: (gameId: string) => void;
  abort: (gameId: string) => void;
  "draw:offer": (gameId: string) => void;
  "draw:accept": (gameId: string) => void;
  "draw:decline": (gameId: string) => void;
  chat: (payload: { gameId: string; text: string }) => void;
}

// ---- Server -> Client events ----
export interface ServerToClientEvents {
  "queue:waiting": (tc: TimeControl) => void;
  "game:start": (snapshot: GameSnapshot) => void;
  "game:state": (snapshot: GameSnapshot) => void;
  "game:move": (payload: {
    move: MoveResult;
    fen: string;
    moves: string[];
    turn: Color;
    clock: ClockState;
  }) => void;
  "game:over": (payload: GameOverPayload) => void;
  "draw:offered": (by: Color) => void;
  "draw:declined": () => void;
  chat: (msg: ChatMessage) => void;
  "opponent:disconnected": () => void;
  "opponent:reconnected": () => void;
  error: (msg: string) => void;
}

export interface SocketData {
  userId: string;
  username: string;
  rating: number;
}
