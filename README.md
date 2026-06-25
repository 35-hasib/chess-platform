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
