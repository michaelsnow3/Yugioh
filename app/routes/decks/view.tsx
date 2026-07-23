import { Link } from "react-router";
import type { Route } from "./+types/view";
import { SiteNav } from "../../components/site-nav";
import { db } from "../../lib/db.server";
import { requirePlayer } from "../../lib/player.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Your Decks | Duel Arena" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const player = await requirePlayer(request);
  const decks = await db.deck.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { cards: true } } },
  });
  return { decks };
}

export default function ViewDecks({ loaderData }: Route.ComponentProps) {
  const { decks } = loaderData;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Your Decks</h1>
          <Link
            to="/decks/upload"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
          >
            Upload Deck
          </Link>
        </div>

        {decks.length === 0 ? (
          <p className="mt-10 text-gray-400">
            No decks yet.{" "}
            <Link to="/decks/upload" className="text-indigo-400 hover:underline">
              Upload your first deck
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {decks.map((deck) => (
              <li key={deck.id}>
                <Link
                  to={`/decks/${deck.id}`}
                  className="block rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-indigo-500 hover:bg-gray-800"
                >
                  <h2 className="text-lg font-semibold">{deck.name}</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    {deck._count.cards} card{deck._count.cards === 1 ? "" : "s"} &middot;{" "}
                    {new Date(deck.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
