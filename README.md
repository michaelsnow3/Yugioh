# Duel Arena

A Yu-Gi-Oh! deck builder, pack-opening simulator, and real-time dueling app for two players, built with React Router 7.

## Stack

- **React Router 7** (framework mode, SSR) + Vite + TypeScript + Tailwind CSS
- **Prisma + Postgres** ([Neon](https://neon.tech)) for decks, library, and players
  (`prisma/schema.prisma`; connection string in `.env` as `DATABASE_URL`, not committed)
- **Socket.IO** for real-time duel rooms — attached to the Vite dev server in local dev; a
  standalone deployable entry exists for production (see Deployment below)
- **[YGOPRODeck API](https://ygoprodeck.com/api-guide/)** for card data/images — no key required

## Getting Started

```bash
npm install
npx prisma migrate dev
npm run dev
```

Needs a `DATABASE_URL` in `.env` pointing at a Postgres database (a free
[Neon](https://neon.tech) project works well) before the first run.

App runs at `http://localhost:5173` (or the next free port — Vite auto-bumps if something
else on the machine is already using it). Everything — including dueling — works out of
the box with this one command in local dev.

## Features

- **Players**: lightweight name-based identity (no passwords) via a cookie session
- **Deck Builder**: paste a `.ydk`-style list or plain card names, or start from a real
  classic Starter Deck (Yugi/Kaiba/Joey/Pegasus). Edit a deck by swapping cards in from
  your library. Cards resolve via YGOPRODeck.
- **Booster Packs**: 207 real English TCG sets sorted by release date; opening a pack pulls
  a randomized 9-card combination from that set's real card pool into your library
- **Library**: your collected cards across all packs opened
- **Duel**: create or join a room by code, pick a deck, ready up, and play on a live board
  (5 monster zones, 5 spell/trap zones, deck, extra deck, graveyard) with full real-time
  sync and correct hidden-information rules (face-down cards and hands are only visible
  to their owner)

## Deployment

The web app (everything except live dueling) is a normal React Router SSR app and deploys
to Vercel as-is.

**Dueling needs a separate always-on process**, because Vercel's serverless functions can't
hold a persistent WebSocket server or the in-memory room state it depends on. Deploy
`server/standalone.ts` to a host built for long-running Node processes — Railway, Fly.io,
and Render all work and have free tiers:

```bash
npm run duel-server   # runs server/standalone.ts, listens on $PORT (default 3001)
```

That host also needs:
- `ALLOWED_ORIGIN` — your Vercel app's URL (comma-separated if you have more than one,
  e.g. a preview + production domain), so Socket.IO's CORS allows it
- The same `DATABASE_URL` the web app uses, since it looks up decks by id when a duel starts

Then on Vercel, set:
- `VITE_SOCKET_URL` — the standalone server's URL (build-time env var, since it's baked
  into the client bundle)

**Database**: already Postgres (Neon), so both the Vercel app and the duel server can share
it directly — just set the same `DATABASE_URL` in both places.
