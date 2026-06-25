# ♟️ Chess Platform — a chess.com-like multiplayer chess app

Full-stack real-time chess built with **Next.js**, **Node.js**, **Socket.io**, **Prisma/Postgres**.

## Features

- 🔐 Accounts — register/login with JWT, bcrypt-hashed passwords
- ♜ Real-time multiplayer — server-authoritative move validation (chess.js)
- ✅ Full chess rules — castling, en passant, promotion, check/checkmate/stalemate, threefold repetition, 50-move rule, insufficient material
- ⏱️ Time controls — bullet / blitz / rapid with increment, server-authoritative clocks
- 🤝 Matchmaking — queue by time control, plus private game invites by link
- 🏳️ Game controls — resign, offer/accept draw, abort
- 📜 Move history — SAN notation, live updating
- 💬 In-game chat
- 📈 Elo ratings + leaderboard
- 🎞️ Game review — replay finished games move-by-move
- 👀 Spectating

## Quick start

### 1. Database (one-time)

A Postgres role + database are required. Run once (adjust if your superuser differs):

```bash
sudo -u postgres psql -c "CREATE ROLE chess LOGIN PASSWORD 'chess';" -c "CREATE DATABASE chessdb OWNER chess;"
```

The connection string lives in `apps/server/.env` as:
`DATABASE_URL="postgresql://chess:chess@localhost:5432/chessdb"`

### 2. Install & migrate

```bash
npm install
npm run db:migrate
```

### 3. Run

```bash
npm run dev
```

- Web:    http://localhost:3000
- Server: http://localhost:4000

## Architecture

```
apps/
  server/   Express + Socket.io + Prisma  (port 4000)
    src/
      index.ts            HTTP + Socket.io bootstrap
      env.ts              env config
      prisma.ts           Prisma client singleton
      auth/               JWT + bcrypt, REST routes
      api/                leaderboard / profile / games REST
      game/               GameManager, matchmaking, clocks, socket handlers
      elo.ts              rating math
    prisma/schema.prisma  User / Game models
  web/      Next.js App Router + Tailwind   (port 3000)
    src/
      app/                pages (lobby, login, game/[id], leaderboard, profile)
      components/         board, clock, move list, chat, controls
      lib/                api client, socket, auth context
```


```
What I changed to make it deploy-ready

  1. Moved tsx + prisma into dependencies (server) — production hosts prune devDependencies, and both are needed at runtime. Re-installed and the server still
  type-checks clean. ✅
  2. CORS now accepts multiple origins — CLIENT_ORIGIN can be a comma-separated list, so your Vercel production URL and preview URLs both work.
  3. Added render.yaml — a Render Blueprint that provisions the server and a Postgres DB in one click, auto-wiring DATABASE_URL and generating JWT_SECRET.
  4. Added DEPLOY.md — the step-by-step guide.

  Why this split (important)

  Vercel can't host the Socket.io server — its serverless functions don't hold persistent WebSocket connections. So:
  - Render = realtime server + Postgres database
  - Vercel = Next.js web app
  - GitHub = the source both deploy from

  The steps

  1. Push to GitHub
  git init && git add . && git commit -m "Chess platform"
  git branch -M main
  git remote add origin https://github.com/<you>/<repo>.git
  git push -u origin main

  2. Render (server + DB) — New + → Blueprint → select your repo → Apply. It reads render.yaml, creates the DB + server, runs prisma db push, and starts it. Copy the URL
  (e.g. https://chess-server.onrender.com).

  3. Vercel (web) — Add New → Project → import the repo. Set Root Directory = apps/web, add env var NEXT_PUBLIC_SERVER_URL = your Render URL → Deploy. Copy the Vercel
  URL.

  4. Connect them — back in Render, set CLIENT_ORIGIN = your Vercel URL (e.g. https://your-app.vercel.app, no trailing slash) → it redeploys.

  5. Play at your Vercel URL.

  Full details, the env-var reference, and troubleshooting are in DEPLOY.md.

  Two things to know about free tiers

  - Render free server sleeps after ~15 min idle → first request cold-starts in 30–60s.
  - Render free Postgres expires after 30 days.

  Both fine for a demo; upgrade for anything permanent.

  Want me to run git init and make the first commit now so it's ready to push? (I won't push to GitHub — that needs your remote and auth.)

```
