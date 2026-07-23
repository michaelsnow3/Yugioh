import { db } from "./db.server";
import { getPlayerId } from "./session.server";

export async function getPlayer(request: Request) {
  const playerId = await getPlayerId(request);
  if (!playerId) return null;
  return db.player.findUnique({ where: { id: playerId } });
}

export async function requirePlayer(request: Request) {
  const player = await getPlayer(request);
  if (!player) {
    const url = new URL(request.url);
    throw new Response(null, {
      status: 302,
      headers: { Location: `/players/new?redirectTo=${encodeURIComponent(url.pathname)}` },
    });
  }
  return player;
}
