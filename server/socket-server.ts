import { Server } from "socket.io";

type HttpServer = NonNullable<ConstructorParameters<typeof Server>[0]>;
import { db } from "../app/lib/db.server";
import type { DuelActionPayload } from "../app/lib/duel-types";
import { fetchCardsByIds } from "../app/lib/ygoprodeck.server";
import {
  applyAction,
  bothReady,
  bothRematchReady,
  cancelRoom,
  createRoom,
  disconnectSocket,
  getPlayerIds,
  getRoomView,
  getSocketId,
  joinRoom,
  requestRematch,
  resetRematch,
  setDeck,
  setReady,
  setSocket,
  startDuel,
  type DeckCardInput,
} from "./duel-rooms";

let io: Server | undefined;

export function attachSocketServer(httpServer: HttpServer) {
  if (io) return io;

  // Same-origin (dev, or the split-server client pointed elsewhere via
  // VITE_SOCKET_URL) needs no CORS config. When the socket server is
  // deployed separately from the web app (e.g. Vercel + a standalone host),
  // set ALLOWED_ORIGIN to the web app's URL(s), comma-separated.
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  io = new Server(httpServer, {
    path: "/ws/duel",
    cors: allowedOrigin
      ? { origin: allowedOrigin.split(",").map((o) => o.trim()) }
      : undefined,
  });

  function broadcastRoom(code: string) {
    for (const playerId of getPlayerIds(code)) {
      const view = getRoomView(code, playerId);
      if ("error" in view) continue;
      const socketId = getSocketId(code, playerId);
      if (socketId) io!.to(socketId).emit("room:state", view);
    }
  }

  async function beginDuel(code: string) {
    const decks: Record<string, DeckCardInput[]> = {};
    for (const playerId of getPlayerIds(code)) {
      const roomView = getRoomView(code, playerId);
      if ("error" in roomView) continue;
      const me = roomView.players.find((p) => p.playerId === playerId);
      if (!me?.deckId) continue;

      const deckCards = await db.deckCard.findMany({ where: { deckId: me.deckId } });
      const frameTypes = await fetchCardsByIds(deckCards.map((c) => c.cardId));
      decks[playerId] = deckCards.map((c) => ({
        cardId: c.cardId,
        name: c.name,
        imageUrl: c.imageUrl,
        frameType: frameTypes.get(c.cardId)?.frameType ?? "normal",
        section: c.section,
        quantity: c.quantity,
      }));
    }

    startDuel(code, decks);
  }

  async function startDuelIfBothReady(code: string) {
    if (!bothReady(code)) return;
    await beginDuel(code);
  }

  io.on("connection", (socket) => {
    socket.on(
      "room:create",
      (
        { playerId, playerName }: { playerId: string; playerName: string },
        ack: (res: { code?: string; error?: string }) => void
      ) => {
        const room = createRoom(playerId, playerName);
        socket.data.playerId = playerId;
        socket.data.code = room.code;
        socket.join(room.code);
        setSocket(room.code, playerId, socket.id);
        ack({ code: room.code });
        broadcastRoom(room.code);
      }
    );

    socket.on(
      "room:join",
      (
        { code, playerId, playerName }: { code: string; playerId: string; playerName: string },
        ack: (res: { code?: string; error?: string }) => void
      ) => {
        const result = joinRoom(code, playerId, playerName);
        if ("error" in result) {
          ack({ error: result.error });
          return;
        }
        socket.data.playerId = playerId;
        socket.data.code = result.code;
        socket.join(result.code);
        setSocket(result.code, playerId, socket.id);
        ack({ code: result.code });
        broadcastRoom(result.code);
      }
    );

    socket.on(
      "room:setDeck",
      ({
        code,
        playerId,
        deckId,
        deckName,
      }: {
        code: string;
        playerId: string;
        deckId: string;
        deckName: string;
      }) => {
        setDeck(code, playerId, deckId, deckName);
        broadcastRoom(code);
      }
    );

    socket.on(
      "room:ready",
      async ({ code, playerId, ready }: { code: string; playerId: string; ready: boolean }) => {
        setReady(code, playerId, ready);
        try {
          await startDuelIfBothReady(code);
        } catch (err) {
          console.error("Failed to start duel for room", code, err);
          const detail = err instanceof Error ? err.message : String(err);
          socket.emit("room:error", `Couldn't start the duel: ${detail}`);
        }
        broadcastRoom(code);
      }
    );

    socket.on("room:cancel", ({ code }: { code: string; playerId: string }) => {
      io!.to(code).emit("room:cancelled");
      cancelRoom(code);
    });

    socket.on("room:rematchReady", async ({ code, playerId }: { code: string; playerId: string }) => {
      requestRematch(code, playerId);
      try {
        if (bothRematchReady(code)) {
          await beginDuel(code);
          resetRematch(code);
        }
      } catch (err) {
        console.error("Failed to start rematch for room", code, err);
        const detail = err instanceof Error ? err.message : String(err);
        socket.emit("room:error", `Couldn't start the rematch: ${detail}`);
      }
      broadcastRoom(code);
    });

    socket.on(
      "duel:action",
      ({ code, playerId, action }: { code: string; playerId: string; action: DuelActionPayload }) => {
        const result = applyAction(code, playerId, action);
        if (!result.ok) {
          socket.emit("room:error", result.error);
          return;
        }
        if (result.searchResult) {
          socket.emit("duel:searchResult", result.searchResult);
        }
        if (result.event) {
          io!.to(code).emit("duel:event", result.event);
        }
        broadcastRoom(code);
      }
    );

    socket.on("disconnect", () => {
      disconnectSocket(socket.id);
      const code = socket.data.code as string | undefined;
      if (code) broadcastRoom(code);
    });
  });

  return io;
}
