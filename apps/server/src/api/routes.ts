import { Router } from "express";
import { prisma } from "../prisma.js";

export const apiRouter = Router();

// Top players by rating
apiRouter.get("/leaderboard", async (_req, res) => {
  const players = await prisma.user.findMany({
    orderBy: { rating: "desc" },
    take: 50,
    select: {
      id: true,
      username: true,
      rating: true,
      wins: true,
      losses: true,
      draws: true,
    },
  });
  res.json({ players });
});

// Public profile + recent games
apiRouter.get("/users/:username", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true,
      username: true,
      rating: true,
      wins: true,
      losses: true,
      draws: true,
      createdAt: true,
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const games = await prisma.game.findMany({
    where: {
      status: "FINISHED",
      OR: [{ whiteId: user.id }, { blackId: user.id }],
    },
    orderBy: { finishedAt: "desc" },
    take: 25,
    include: {
      white: { select: { username: true, rating: true } },
      black: { select: { username: true, rating: true } },
    },
  });

  res.json({ user, games });
});

// Single game (for review / replay / spectate bootstrap)
apiRouter.get("/games/:id", async (req, res) => {
  const game = await prisma.game.findUnique({
    where: { id: req.params.id },
    include: {
      white: { select: { id: true, username: true, rating: true } },
      black: { select: { id: true, username: true, rating: true } },
    },
  });
  if (!game) return res.status(404).json({ error: "Game not found" });
  res.json({ game });
});
