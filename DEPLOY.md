# 🚀 Deploying to production (GitHub + Render + Vercel)

Architecture for hosting:

- **Render** → the Node/Express + **Socket.io** server **and** a managed Postgres DB.
  (Vercel's serverless functions can't hold the persistent WebSocket connections this game needs, so the realtime server lives on Render.)
- **Vercel** → the Next.js web app.
- **GitHub** → source both platforms deploy from.

---

## 1. Push to GitHub

From the project root:

```bash
git init
git add .
git commit -m "Chess platform"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

> `.gitignore` already excludes `node_modules`, `.next`, and `.env` files — your secrets are not committed.

---

## 2. Deploy the server + database on Render

The repo includes **`render.yaml`** (a Blueprint), so this is mostly automatic.

1. Go to <https://render.com> → **New +** → **Blueprint**.
2. Connect your GitHub and select this repo. Render reads `render.yaml` and shows:
   - a **Web Service** `chess-server`
   - a **Postgres** database `chess-db`
3. Click **Apply**. Render will:
   - create the database and inject `DATABASE_URL` automatically,
   - auto-generate a `JWT_SECRET`,
   - build, push the schema (`prisma db push`), and start the server.
4. When it's live, copy the service URL, e.g. **`https://chess-server.onrender.com`**.
5. Leave `CLIENT_ORIGIN` blank for now — you'll set it in step 4 once you have the Vercel URL.

> **Free-tier note:** Render free web services sleep after ~15 min idle and cold-start in ~30–60 s, and the free Postgres expires after 30 days. Fine for a demo; upgrade for anything real.

### (Optional) seed demo users
In the Render dashboard → `chess-server` → **Shell**:
```bash
npm -w @chess/server run db:seed
```

---

## 3. Deploy the web app on Vercel

1. Go to <https://vercel.com> → **Add New… → Project** → import the same repo.
2. **Configure the project** (important — it's a monorepo):
   - **Root Directory:** `apps/web`
   - Framework Preset: **Next.js** (auto-detected)
   - Build/Install/Output: leave defaults.
3. **Environment Variables** — add:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SERVER_URL` | your Render URL, e.g. `https://chess-server.onrender.com` |

4. Click **Deploy**. When done you'll get a URL like **`https://your-app.vercel.app`**.

---

## 4. Point the server at the web app (CORS)

Back in Render → `chess-server` → **Environment**:

- Set **`CLIENT_ORIGIN`** to your Vercel URL:
  ```
  https://your-app.vercel.app
  ```
- To also allow Vercel **preview** deployments, pass a comma-separated list:
  ```
  https://your-app.vercel.app,https://your-app-git-main-you.vercel.app
  ```

Save → Render redeploys. The server now accepts the browser's requests and sockets.

---

## 5. Test it

Open `https://your-app.vercel.app`, register two accounts in two browser windows, pick the same time control, and play. Ratings, history, and review all persist in the Render database.

---

## Environment variables reference

**Server (Render):**

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection (auto from `render.yaml`) |
| `JWT_SECRET` | token signing (auto-generated) |
| `CLIENT_ORIGIN` | allowed web origin(s), comma-separated |
| `PORT` | provided by Render automatically |

**Web (Vercel):**

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SERVER_URL` | URL of the Render server |

---

## Troubleshooting

- **Board loads but moves/login fail / CORS errors in console** → `CLIENT_ORIGIN` on Render doesn't exactly match the Vercel URL (check `https://`, no trailing slash).
- **`NEXT_PUBLIC_SERVER_URL` changes don't take effect** → it's inlined at build time; trigger a fresh Vercel deploy after changing it.
- **First request after idle is slow** → Render free tier cold start; the server is waking up.
- **Schema errors on deploy** → confirm the Render build ran `prisma db push` (it's in `render.yaml`'s `startCommand`).
- **WebSocket won't connect** → make sure the web app talks to the Render URL over `https://` (the client already upgrades ws→wss automatically).
