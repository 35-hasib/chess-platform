import { Chess } from "chess.js";
import { nanoid } from "nanoid";
import type { Server } from "socket.io";
import { prisma } from "../prisma.js";
import { computeElo } from "../elo.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Color,
  TimeControl,
  PlayerInfo,
  GameSnapshot,
  ClockState,
} from "./types.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

interface ActiveGame {
  id: string;
  chess: Chess;
  white: PlayerInfo;
  black: PlayerInfo;
  tc: TimeControl;
  whiteMs: number;
  blackMs: number;
  // When the running clock last started ticking (ms epoch). null before move 1.
  turnStartedAt: number | null;
  moves: string[];
  status: "ACTIVE" | "FINISHED" | "ABORTED";
  drawOfferBy: Color | null;
  flagTimer: NodeJS.Timeout | null;
  // socketId per color for targeted messaging / connection tracking
  sockets: { w: string | null; b: string | null };
}

interface PendingGame {
  id: string;
  creator: PlayerInfo;
  creatorSocketId: string;
  creatorColor: Color | "random";
  tc: TimeControl;
}

interface QueueEntry {
  userId: string;
  username: string;
  rating: number;
  socketId: string;
}

function tcKey(tc: TimeControl): string {
  return `${tc.initialTime}+${tc.increment}`;
}

export class GameManager {
  private io: IO;
  private games = new Map<string, ActiveGame>();
  private pending = new Map<string, PendingGame>();
  // matchmaking queues keyed by time control
  private queues = new Map<string, QueueEntry[]>();

  constructor(io: IO) {
    this.io = io;
  }

  // ---------------------------------------------------------------- Matchmaking

  joinQueue(player: QueueEntry, tc: TimeControl) {
    const key = tcKey(tc);
    const queue = this.queues.get(key) ?? [];

    // Don't queue the same user twice; refresh their socket instead.
    const existingIdx = queue.findIndex((q) => q.userId === player.userId);
    if (existingIdx >= 0) queue[existingIdx] = player;

    // Try to find a different opponent already waiting.
    const opponentIdx = queue.findIndex((q) => q.userId !== player.userId);
    if (opponentIdx >= 0) {
      const opponent = queue.splice(opponentIdx, 1)[0];
      this.queues.set(key, queue);
      this.startGame(opponent, player, tc);
      return;
    }

    if (existingIdx < 0) queue.push(player);
    this.queues.set(key, queue);
    this.io.to(player.socketId).emit("queue:waiting", tc);
  }

  leaveQueue(userId: string) {
    for (const [key, queue] of this.queues) {
      const filtered = queue.filter((q) => q.userId !== userId);
      this.queues.set(key, filtered);
    }
  }

  // ---------------------------------------------------------------- Private games

  createPrivateGame(
    creator: PlayerInfo,
    creatorSocketId: string,
    tc: TimeControl,
    color: Color | "random"
  ): string {
    const id = nanoid(10);
    this.pending.set(id, {
      id,
      creator,
      creatorSocketId,
      creatorColor: color,
      tc,
    });
    return id;
  }

  // ---------------------------------------------------------------- Joining

  /** Join an active game as player (if a slot belongs to them) or spectator. */
  async joinGame(
    gameId: string,
    user: SocketData,
    socketId: string
  ): Promise<void> {
    // Pending private game waiting for a second player?
    const pending = this.pending.get(gameId);
    if (pending) {
      if (pending.creator.userId === user.userId) {
        // Creator is (re)entering their own pending room — wait for an opponent.
        pending.creatorSocketId = socketId;
        this.io.sockets.sockets.get(socketId)?.join(gameId);
        this.io.to(socketId).emit("queue:waiting", pending.tc);
        return;
      }
      this.pending.delete(gameId);
      const joiner: PlayerInfo = {
        userId: user.userId,
        username: user.username,
        rating: user.rating,
      };
      const creatorWhite =
        pending.creatorColor === "w" ||
        (pending.creatorColor === "random" && Math.random() < 0.5);
      const white = creatorWhite ? pending.creator : joiner;
      const black = creatorWhite ? joiner : pending.creator;
      const whiteSocket = creatorWhite ? pending.creatorSocketId : socketId;
      const blackSocket = creatorWhite ? socketId : pending.creatorSocketId;
      await this.startGameWithColors(gameId, white, black, pending.tc, {
        w: whiteSocket,
        b: blackSocket,
      });
      return;
    }

    const game = this.games.get(gameId);
    if (game) {
      // Reconnecting player or spectator — join the room either way.
      this.io.sockets.sockets.get(socketId)?.join(gameId);
      if (game.white.userId === user.userId) {
        game.sockets.w = socketId;
        this.io.to(gameId).emit("opponent:reconnected");
      } else if (game.black.userId === user.userId) {
        game.sockets.b = socketId;
        this.io.to(gameId).emit("opponent:reconnected");
      }
      this.io.to(socketId).emit("game:state", this.snapshot(game, user.userId));
      return;
    }

    // Not in memory — maybe a finished game; client should use REST to review.
    this.io.to(socketId).emit("error", "Game not found or already finished");
  }

  // ---------------------------------------------------------------- Game start

  private async startGame(a: QueueEntry, b: QueueEntry, tc: TimeControl) {
    const id = nanoid(10);
    // Random colors
    const aWhite = Math.random() < 0.5;
    const white = aWhite ? a : b;
    const black = aWhite ? b : a;
    await this.startGameWithColors(
      id,
      { userId: white.userId, username: white.username, rating: white.rating },
      { userId: black.userId, username: black.username, rating: black.rating },
      tc,
      { w: white.socketId, b: black.socketId }
    );
  }

  private async startGameWithColors(
    id: string,
    white: PlayerInfo,
    black: PlayerInfo,
    tc: TimeControl,
    sockets?: { w: string; b: string }
  ) {
    const chess = new Chess();

    // Persist a DB record so the game is reviewable and has a stable id.
    const dbGame = await prisma.game.create({
      data: {
        id,
        whiteId: white.userId,
        blackId: black.userId,
        status: "ACTIVE",
        fen: chess.fen(),
        initialTime: tc.initialTime,
        increment: tc.increment,
        whiteRatingBefore: white.rating,
        blackRatingBefore: black.rating,
      },
    });

    const game: ActiveGame = {
      id: dbGame.id,
      chess,
      white,
      black,
      tc,
      whiteMs: tc.initialTime * 1000,
      blackMs: tc.initialTime * 1000,
      turnStartedAt: null,
      moves: [],
      status: "ACTIVE",
      drawOfferBy: null,
      flagTimer: null,
      sockets: { w: sockets?.w ?? null, b: sockets?.b ?? null },
    };
    this.games.set(id, game);

    // Make both players' sockets join the room and notify them.
    const join = (socketId: string | null) => {
      if (!socketId) return;
      this.io.sockets.sockets.get(socketId)?.join(id);
    };
    join(game.sockets.w);
    join(game.sockets.b);

    if (game.sockets.w)
      this.io.to(game.sockets.w).emit("game:start", this.snapshot(game, white.userId));
    if (game.sockets.b)
      this.io.to(game.sockets.b).emit("game:start", this.snapshot(game, black.userId));
  }

  // ---------------------------------------------------------------- Moves

  makeMove(
    gameId: string,
    userId: string,
    from: string,
    to: string,
    promotion?: string
  ) {
    const game = this.games.get(gameId);
    if (!game || game.status !== "ACTIVE") return;

    const turn = game.chess.turn();
    const moverColor: Color = turn;
    const moverId = moverColor === "w" ? game.white.userId : game.black.userId;
    if (moverId !== userId) {
      this.emitToUser(game, userId, "error", "Not your turn");
      return;
    }

    // Apply elapsed time to the mover's clock before the move.
    this.tickBeforeMove(game);

    let move;
    try {
      move = game.chess.move({ from, to, promotion: promotion as any });
    } catch {
      move = null;
    }
    if (!move) {
      this.emitToUser(game, userId, "error", "Illegal move");
      return;
    }

    game.moves.push(move.san);
    game.drawOfferBy = null;

    // Add increment to the player who just moved.
    if (moverColor === "w") game.whiteMs += game.tc.increment * 1000;
    else game.blackMs += game.tc.increment * 1000;

    // Switch active clock.
    game.turnStartedAt = Date.now();

    const clock = this.clockState(game);
    this.io.to(gameId).emit("game:move", {
      move: {
        from: move.from,
        to: move.to,
        san: move.san,
        color: moverColor,
      },
      fen: game.chess.fen(),
      moves: game.moves,
      turn: game.chess.turn(),
      clock,
    });

    // Game ended by the move itself?
    if (game.chess.isGameOver()) {
      this.endByPosition(game);
      return;
    }

    // Arm flag-fall timer for the player now on move.
    this.armFlagTimer(game);
  }

  /** Subtract elapsed time from the player who is currently on move. */
  private tickBeforeMove(game: ActiveGame) {
    if (game.turnStartedAt === null) {
      // First move: clock starts now, no time consumed yet.
      return;
    }
    const elapsed = Date.now() - game.turnStartedAt;
    if (game.chess.turn() === "w") game.whiteMs = Math.max(0, game.whiteMs - elapsed);
    else game.blackMs = Math.max(0, game.blackMs - elapsed);
  }

  private armFlagTimer(game: ActiveGame) {
    if (game.flagTimer) clearTimeout(game.flagTimer);
    const onMove = game.chess.turn();
    const remaining = onMove === "w" ? game.whiteMs : game.blackMs;
    game.flagTimer = setTimeout(() => {
      this.handleFlagFall(game, onMove);
    }, remaining + 50);
  }

  private handleFlagFall(game: ActiveGame, color: Color) {
    if (game.status !== "ACTIVE") return;
    // Confirm the time really expired.
    this.tickBeforeMove(game);
    const remaining = color === "w" ? game.whiteMs : game.blackMs;
    if (remaining > 0) {
      this.armFlagTimer(game);
      return;
    }
    if (color === "w") game.whiteMs = 0;
    else game.blackMs = 0;
    const result = color === "w" ? "BLACK_WIN" : "WHITE_WIN";
    void this.finishGame(game, result, "timeout");
  }

  // ---------------------------------------------------------------- Resign / draw / abort

  resign(gameId: string, userId: string) {
    const game = this.games.get(gameId);
    if (!game || game.status !== "ACTIVE") return;
    const color = this.colorOf(game, userId);
    if (!color) return;
    const result = color === "w" ? "BLACK_WIN" : "WHITE_WIN";
    void this.finishGame(game, result, "resignation");
  }

  abort(gameId: string, userId: string) {
    const game = this.games.get(gameId);
    if (!game || game.status !== "ACTIVE") return;
    if (!this.colorOf(game, userId)) return;
    // Only abortable before any move has been played.
    if (game.moves.length > 0) {
      this.emitToUser(game, userId, "error", "Game can no longer be aborted");
      return;
    }
    void this.finishGame(game, null, "aborted");
  }

  offerDraw(gameId: string, userId: string) {
    const game = this.games.get(gameId);
    if (!game || game.status !== "ACTIVE") return;
    const color = this.colorOf(game, userId);
    if (!color) return;
    game.drawOfferBy = color;
    // Notify the opponent.
    const oppSocket = color === "w" ? game.sockets.b : game.sockets.w;
    if (oppSocket) this.io.to(oppSocket).emit("draw:offered", color);
  }

  acceptDraw(gameId: string, userId: string) {
    const game = this.games.get(gameId);
    if (!game || game.status !== "ACTIVE") return;
    const color = this.colorOf(game, userId);
    if (!color || !game.drawOfferBy || game.drawOfferBy === color) return;
    void this.finishGame(game, "DRAW", "agreement");
  }

  declineDraw(gameId: string, userId: string) {
    const game = this.games.get(gameId);
    if (!game || game.status !== "ACTIVE") return;
    const color = this.colorOf(game, userId);
    if (!color || !game.drawOfferBy || game.drawOfferBy === color) return;
    game.drawOfferBy = null;
    this.io.to(gameId).emit("draw:declined");
  }

  // ---------------------------------------------------------------- Chat

  chat(gameId: string, username: string, text: string) {
    const clean = text.trim().slice(0, 300);
    if (!clean) return;
    this.io.to(gameId).emit("chat", { username, text: clean, ts: Date.now() });
  }

  // ---------------------------------------------------------------- Disconnect

  handleDisconnect(socketId: string) {
    this.leaveQueueBySocket(socketId);
    for (const game of this.games.values()) {
      if (game.sockets.w === socketId) {
        game.sockets.w = null;
        this.io.to(game.id).emit("opponent:disconnected");
      } else if (game.sockets.b === socketId) {
        game.sockets.b = null;
        this.io.to(game.id).emit("opponent:disconnected");
      }
    }
  }

  private leaveQueueBySocket(socketId: string) {
    for (const [key, queue] of this.queues) {
      this.queues.set(
        key,
        queue.filter((q) => q.socketId !== socketId)
      );
    }
  }

  // ---------------------------------------------------------------- End-of-game

  private endByPosition(game: ActiveGame) {
    const chess = game.chess;
    let result: "WHITE_WIN" | "BLACK_WIN" | "DRAW";
    let reason: string;

    if (chess.isCheckmate()) {
      // The side to move has been mated, so the other side won.
      result = chess.turn() === "w" ? "BLACK_WIN" : "WHITE_WIN";
      reason = "checkmate";
    } else if (chess.isStalemate()) {
      result = "DRAW";
      reason = "stalemate";
    } else if (chess.isThreefoldRepetition()) {
      result = "DRAW";
      reason = "threefold repetition";
    } else if (chess.isInsufficientMaterial()) {
      result = "DRAW";
      reason = "insufficient material";
    } else if (chess.isDraw()) {
      result = "DRAW";
      reason = "50-move rule";
    } else {
      result = "DRAW";
      reason = "draw";
    }
    void this.finishGame(game, result, reason);
  }

  private async finishGame(
    game: ActiveGame,
    result: "WHITE_WIN" | "BLACK_WIN" | "DRAW" | null,
    reason: string
  ) {
    if (game.status !== "ACTIVE") return;
    if (game.flagTimer) clearTimeout(game.flagTimer);
    game.turnStartedAt = null;

    // Aborted game: no rating change, mark ABORTED, no result.
    if (result === null) {
      game.status = "ABORTED";
      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: "ABORTED",
          endReason: reason,
          fen: game.chess.fen(),
          pgnMoves: game.moves.join(" "),
          finishedAt: new Date(),
        },
      });
      this.io.to(game.id).emit("game:over", {
        result: "DRAW",
        reason: "aborted",
      });
      this.games.delete(game.id);
      return;
    }

    game.status = "FINISHED";

    const whiteScore = result === "WHITE_WIN" ? 1 : result === "DRAW" ? 0.5 : 0;
    const elo = computeElo(game.white.rating, game.black.rating, whiteScore);

    // Persist game + update both players atomically.
    await prisma.$transaction([
      prisma.game.update({
        where: { id: game.id },
        data: {
          status: "FINISHED",
          result,
          endReason: reason,
          fen: game.chess.fen(),
          pgnMoves: game.moves.join(" "),
          whiteRatingAfter: elo.whiteAfter,
          blackRatingAfter: elo.blackAfter,
          finishedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: game.white.userId },
        data: {
          rating: elo.whiteAfter,
          wins: { increment: result === "WHITE_WIN" ? 1 : 0 },
          losses: { increment: result === "BLACK_WIN" ? 1 : 0 },
          draws: { increment: result === "DRAW" ? 1 : 0 },
        },
      }),
      prisma.user.update({
        where: { id: game.black.userId },
        data: {
          rating: elo.blackAfter,
          wins: { increment: result === "BLACK_WIN" ? 1 : 0 },
          losses: { increment: result === "WHITE_WIN" ? 1 : 0 },
          draws: { increment: result === "DRAW" ? 1 : 0 },
        },
      }),
    ]);

    this.io.to(game.id).emit("game:over", {
      result,
      reason,
      ratings: {
        whiteBefore: game.white.rating,
        blackBefore: game.black.rating,
        whiteAfter: elo.whiteAfter,
        blackAfter: elo.blackAfter,
      },
    });

    this.games.delete(game.id);
  }

  // ---------------------------------------------------------------- Helpers

  private colorOf(game: ActiveGame, userId: string): Color | null {
    if (game.white.userId === userId) return "w";
    if (game.black.userId === userId) return "b";
    return null;
  }

  private emitToUser(
    game: ActiveGame,
    userId: string,
    event: "error",
    msg: string
  ) {
    const color = this.colorOf(game, userId);
    const socketId = color === "w" ? game.sockets.w : game.sockets.b;
    if (socketId) this.io.to(socketId).emit(event, msg);
  }

  private clockState(game: ActiveGame): ClockState {
    return {
      whiteMs: game.whiteMs,
      blackMs: game.blackMs,
      activeColor: game.turnStartedAt === null ? null : game.chess.turn(),
      updatedAt: game.turnStartedAt ?? Date.now(),
    };
  }

  private snapshot(game: ActiveGame, viewerId?: string): GameSnapshot {
    const yourColor = viewerId ? this.colorOf(game, viewerId) : null;
    return {
      id: game.id,
      white: game.white,
      black: game.black,
      fen: game.chess.fen(),
      moves: game.moves,
      turn: game.chess.turn(),
      timeControl: game.tc,
      clock: this.clockState(game),
      status: game.status,
      result: null,
      endReason: null,
      drawOfferBy: game.drawOfferBy,
      yourColor,
    };
  }
}
