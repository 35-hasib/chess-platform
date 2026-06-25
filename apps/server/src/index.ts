import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { env } from "./env.js";
import { authRouter } from "./auth/routes.js";
import { apiRouter } from "./api/routes.js";
import { registerSocketHandlers } from "./game/socket.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./game/types.js";

// CLIENT_ORIGIN may be a comma-separated list (prod + preview URLs).
const allowedOrigins = env.CLIENT_ORIGIN.split(",").map((o) => o.trim());
const corsOrigin: cors.CorsOptions["origin"] = (origin, cb) => {
  // Allow same-origin / curl (no origin header) and any whitelisted origin.
  if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
  cb(new Error(`Origin ${origin} not allowed by CORS`));
};

const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api", apiRouter);

const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});

registerSocketHandlers(io);

httpServer.listen(env.PORT, () => {
  console.log(`♟  Chess server listening on http://localhost:${env.PORT}`);
  console.log(`   Accepting clients from ${env.CLIENT_ORIGIN}`);
});
