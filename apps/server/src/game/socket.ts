import type { Server, Socket } from "socket.io";
import { verifyToken } from "../auth/jwt.js";
import { prisma } from "../prisma.js";
import { GameManager } from "./GameManager.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  TimeControl,
} from "./types.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>;

// Reasonable bounds so clients can't request absurd time controls.
function sanitizeTC(tc: TimeControl): TimeControl | null {
  if (!tc) return null;
  const initialTime = Math.floor(Number(tc.initialTime));
  const increment = Math.floor(Number(tc.increment));
  if (!Number.isFinite(initialTime) || !Number.isFinite(increment)) return null;
  if (initialTime < 10 || initialTime > 10800) return null; // 10s .. 3h
  if (increment < 0 || increment > 180) return null;
  return { initialTime, increment };
}

export function registerSocketHandlers(io: IO) {
  const manager = new GameManager(io);

  // Authenticate every socket connection via JWT in the handshake.
  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers.authorization?.replace("Bearer ", "") ??
        undefined);
    const payload = token ? verifyToken(token) : null;
    if (!payload) return next(new Error("Unauthorized"));

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, rating: true },
    });
    if (!user) return next(new Error("Unauthorized"));

    socket.data.userId = user.id;
    socket.data.username = user.username;
    socket.data.rating = user.rating;
    next();
  });

  io.on("connection", (socket: GameSocket) => {
    const user = socket.data;

    socket.on("queue:join", (tc) => {
      const clean = sanitizeTC(tc);
      if (!clean) return socket.emit("error", "Invalid time control");
      manager.joinQueue(
        {
          userId: user.userId,
          username: user.username,
          rating: user.rating,
          socketId: socket.id,
        },
        clean
      );
    });

    socket.on("queue:leave", () => {
      manager.leaveQueue(user.userId);
    });

    socket.on("game:create", (payload, ack) => {
      const clean = sanitizeTC(payload?.tc);
      if (!clean) return ack({ error: "Invalid time control" });
      const color =
        payload.color === "w" || payload.color === "b"
          ? payload.color
          : "random";
      const gameId = manager.createPrivateGame(
        {
          userId: user.userId,
          username: user.username,
          rating: user.rating,
        },
        socket.id,
        clean,
        color
      );
      ack({ gameId });
    });

    socket.on("game:join", (gameId) => {
      if (typeof gameId !== "string") return;
      void manager.joinGame(gameId, user, socket.id);
    });

    socket.on("game:leave", (gameId) => {
      socket.leave(gameId);
    });

    socket.on("move", ({ gameId, from, to, promotion }) => {
      manager.makeMove(gameId, user.userId, from, to, promotion);
    });

    socket.on("resign", (gameId) => manager.resign(gameId, user.userId));
    socket.on("abort", (gameId) => manager.abort(gameId, user.userId));
    socket.on("draw:offer", (gameId) => manager.offerDraw(gameId, user.userId));
    socket.on("draw:accept", (gameId) =>
      manager.acceptDraw(gameId, user.userId)
    );
    socket.on("draw:decline", (gameId) =>
      manager.declineDraw(gameId, user.userId)
    );

    socket.on("chat", ({ gameId, text }) => {
      manager.chat(gameId, user.username, text);
    });

    socket.on("disconnect", () => {
      manager.handleDisconnect(socket.id);
    });
  });
}
