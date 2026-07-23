import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("players/new", "routes/players/new.tsx"),
  route("decks", "routes/decks/home.tsx"),
  route("decks/upload", "routes/decks/upload.tsx"),
  route("decks/view", "routes/decks/view.tsx"),
  route("decks/:deckId", "routes/decks/deck.tsx"),
  route("decks/:deckId/edit", "routes/decks/edit.tsx"),
  route("packs", "routes/packs/home.tsx"),
  route("packs/:slug", "routes/packs/open.tsx"),
  route("library", "routes/library.tsx"),
  route("library/start", "routes/library/start.tsx"),
  route("duel", "routes/duel/home.tsx"),
  route("duel/:code", "routes/duel/room.tsx"),
] satisfies RouteConfig;
