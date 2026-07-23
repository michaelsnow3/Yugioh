import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { SiteNav } from "../../components/site-nav";
import { requirePlayer } from "../../lib/player.server";
import { getSocket } from "../../lib/socket-client";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Duel | Duel Arena" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const player = await requirePlayer(request);
  return { player };
}

export default function DuelHome({ loaderData }: Route.ComponentProps) {
  const { player } = loaderData;
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function createRoom() {
    setBusy(true);
    setError(null);
    getSocket().emit(
      "room:create",
      { playerId: player.id, playerName: player.name },
      (res: { code?: string; error?: string }) => {
        setBusy(false);
        if (res.error) return setError(res.error);
        if (res.code) navigate(`/duel/${res.code}`);
      }
    );
  }

  function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setError(null);
    getSocket().emit(
      "room:join",
      { code, playerId: player.id, playerName: player.name },
      (res: { code?: string; error?: string }) => {
        setBusy(false);
        if (res.error) return setError(res.error);
        if (res.code) navigate(`/duel/${res.code}`);
      }
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-md px-6 py-16">
        <Link to="/" className="text-sm text-indigo-400 hover:underline">
          &larr; Back to home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Start a Duel</h1>
        <p className="mt-2 text-gray-400">
          Create a room and share the code with your friend, or enter their code to join.
        </p>

        <button
          type="button"
          onClick={createRoom}
          disabled={busy}
          className="mt-8 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          Create Room
        </button>

        <div className="mt-8 flex flex-col gap-3">
          <span className="text-sm font-medium text-gray-300">Or join a room</span>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Room code"
              className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 uppercase tracking-widest text-white outline-none focus:border-indigo-500"
              maxLength={5}
            />
            <button
              type="button"
              onClick={joinRoom}
              disabled={busy || !joinCode.trim()}
              className="rounded-lg border border-gray-700 px-5 py-2 font-semibold text-gray-200 transition hover:bg-gray-800 disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </main>
    </div>
  );
}
