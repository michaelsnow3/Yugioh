import { createCookieSessionStorage } from "react-router";

export const playerSession = createCookieSessionStorage({
  cookie: {
    name: "player_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  },
});

export async function getPlayerId(request: Request): Promise<string | null> {
  const session = await playerSession.getSession(request.headers.get("Cookie"));
  return session.get("playerId") ?? null;
}

export async function commitPlayerSession(playerId: string) {
  const session = await playerSession.getSession();
  session.set("playerId", playerId);
  return playerSession.commitSession(session);
}
