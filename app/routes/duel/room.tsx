import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/room";
import { DuelBoard } from "../../components/duel/duel-board";
import { SiteNav } from "../../components/site-nav";
import { db } from "../../lib/db.server";
import type { RoomView } from "../../lib/duel-types";
import { requirePlayer } from "../../lib/player.server";
import { getSocket } from "../../lib/socket-client";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Duel Room | Duel Arena" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const player = await requirePlayer(request);
  const decks = await db.deck.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "desc" },
  });
  return { player, decks, code: params.code.toUpperCase() };
}

function PlayerCard({ label, player }: { label: string; player?: RoomView["players"][number] }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      {player ? (
        <>
          <p className="mt-1 font-semibold">{player.playerName}</p>
          <p className="mt-1 text-sm text-gray-400">
            {player.deckName ?? "No deck chosen"} {player.ready && "· Ready"}
          </p>
          {!player.connected && <p className="mt-1 text-xs text-red-400">Disconnected</p>}
        </>
      ) : (
        <p className="mt-1 text-gray-500">Waiting for opponent...</p>
      )}
    </div>
  );
}

export default function DuelRoom({ loaderData }: Route.ComponentProps) {
  const { player, decks, code } = loaderData;
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    function onState(view: RoomView) {
      setRoom(view);
    }
    function onCancelled() {
      setCancelled(true);
    }
    function onError(msg: string) {
      setError(msg);
    }

    socket.on("room:state", onState);
    socket.on("room:cancelled", onCancelled);
    socket.on("room:error", onError);

    socket.emit(
      "room:join",
      { code, playerId: player.id, playerName: player.name },
      (res: { code?: string; error?: string }) => {
        if (res.error) setError(res.error);
      }
    );

    return () => {
      socket.off("room:state", onState);
      socket.off("room:cancelled", onCancelled);
      socket.off("room:error", onError);
    };
  }, [code, player.id, player.name]);

  function chooseDeck(deckId: string, deckName: string) {
    getSocket().emit("room:setDeck", { code, playerId: player.id, deckId, deckName });
  }

  function toggleReady(ready: boolean) {
    getSocket().emit("room:ready", { code, playerId: player.id, ready });
  }

  function cancelRoom() {
    getSocket().emit("room:cancel", { code, playerId: player.id });
  }

  if (cancelled) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <SiteNav />
        <main className="mx-auto max-w-md px-6 py-16 text-center">
          <p className="text-gray-400">This room was cancelled.</p>
          <Link to="/duel" className="mt-4 inline-block text-indigo-400 hover:underline">
            Back to Duel
          </Link>
        </main>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <SiteNav />
        <main className="mx-auto max-w-md px-6 py-16">
          <p className="text-gray-400">Connecting to room {code}...</p>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </main>
      </div>
    );
  }

  if (room.phase === "duel" && room.duel) {
    return <DuelBoard duel={room.duel} code={code} />;
  }

  const me = room.players.find((p) => p.playerId === room.you);
  const opponent = room.players.find((p) => p.playerId !== room.you);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-3xl font-bold">Duel Room</h1>
        <p className="mt-2 text-gray-400">
          Room code:{" "}
          <span className="font-mono text-lg tracking-widest text-white">{code}</span>
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <PlayerCard label="You" player={me} />
          <PlayerCard label="Opponent" player={opponent} />
        </div>

        <label className="mt-8 flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-300">Your deck</span>
          <select
            defaultValue={me?.deckId ?? ""}
            onChange={(e) => {
              const deck = decks.find((d) => d.id === e.target.value);
              if (deck) chooseDeck(deck.id, deck.name);
            }}
            className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white outline-none focus:border-indigo-500"
          >
            <option value="" disabled>
              Choose a deck...
            </option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => toggleReady(!me?.ready)}
            disabled={!me?.deckId}
            className={`flex-1 rounded-lg px-5 py-3 font-semibold transition disabled:opacity-50 ${
              me?.ready ? "bg-gray-700 hover:bg-gray-600" : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {me?.ready ? "Unready" : "Ready Up"}
          </button>
          <button
            type="button"
            onClick={cancelRoom}
            className="rounded-lg border border-red-900 px-5 py-3 font-semibold text-red-400 transition hover:bg-red-950"
          >
            Cancel Room
          </button>
        </div>

        {decks.length === 0 && (
          <p className="mt-4 text-sm text-yellow-300">
            You don't have any decks yet.{" "}
            <Link to="/decks/upload" className="underline">
              Build one
            </Link>{" "}
            first.
          </p>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </main>
    </div>
  );
}
