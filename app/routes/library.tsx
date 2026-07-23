import { Link } from "react-router";
import type { Route } from "./+types/library";
import { SiteNav } from "../components/site-nav";
import { db } from "../lib/db.server";
import { requirePlayer } from "../lib/player.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Library | Duel Arena" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const player = await requirePlayer(request);
  const cards = await db.libraryCard.findMany({
    where: { playerId: player.id },
    orderBy: { name: "asc" },
  });
  return { player, cards };
}

export default function Library({ loaderData }: Route.ComponentProps) {
  const { player, cards } = loaderData;
  const totalCards = cards.reduce((n, c) => n + c.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <Link to="/" className="text-sm text-indigo-400 hover:underline">
          &larr; Back to home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{player.name}'s Library</h1>
        <p className="mt-2 text-gray-400">
          {cards.length} unique card{cards.length === 1 ? "" : "s"} ({totalCards} total) collected
          from booster packs.
        </p>

        <Link
          to="/library/start"
          className="mt-6 flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-indigo-500 hover:bg-gray-800"
        >
          <div>
            <h2 className="text-lg font-semibold">Start Your Draft Deck</h2>
            <p className="mt-1 text-sm text-gray-400">
              Load a classic starter deck or upload your own decklist — its
              cards are added to your library too.
            </p>
          </div>
          <span className="text-indigo-400">&rarr;</span>
        </Link>

        {cards.length === 0 ? (
          <p className="mt-10 text-gray-400">
            No cards yet.{" "}
            <Link to="/packs" className="text-indigo-400 hover:underline">
              Open a booster pack
            </Link>{" "}
            to start your collection.
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6">
            {cards.map((card) => (
              <li key={card.id} className="flex flex-col items-center gap-1">
                <div className="relative w-full overflow-hidden rounded-lg border border-gray-800">
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} className="w-full" />
                  ) : (
                    <div className="flex aspect-[59/86] w-full items-center justify-center bg-gray-900 p-2 text-center text-xs text-gray-400">
                      {card.name}
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-bold">
                    x{card.quantity}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
