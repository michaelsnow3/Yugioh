import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/open";
import { SiteNav } from "../../components/site-nav";
import { getBoosterPackBySlug } from "../../lib/booster-packs.server";
import { db } from "../../lib/db.server";
import { openPack } from "../../lib/pack-sim.server";
import { requirePlayer } from "../../lib/player.server";
import { fetchCardsInSet, type SetCard } from "../../lib/ygoprodeck.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data ? `${data.pack.name} | Duel Arena` : "Pack | Duel Arena" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requirePlayer(request);
  const pack = await getBoosterPackBySlug(params.slug);
  if (!pack) {
    throw new Response("Booster pack not found", { status: 404 });
  }
  return { pack };
}

export async function action({ request, params }: Route.ActionArgs) {
  const player = await requirePlayer(request);
  const pack = await getBoosterPackBySlug(params.slug);
  if (!pack) {
    throw new Response("Booster pack not found", { status: 404 });
  }

  const pool = await fetchCardsInSet(pack.name);
  if (pool.length === 0) {
    return { error: "Couldn't load this pack's card pool right now. Try again." };
  }

  const pulled = openPack(pool);

  const counts = new Map<number, { card: SetCard; count: number }>();
  for (const card of pulled) {
    const existing = counts.get(card.id);
    if (existing) existing.count += 1;
    else counts.set(card.id, { card, count: 1 });
  }

  await Promise.all(
    [...counts.values()].map(({ card, count }) =>
      db.libraryCard.upsert({
        where: { playerId_cardId: { playerId: player.id, cardId: card.id } },
        create: {
          playerId: player.id,
          cardId: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          frameType: card.frameType,
          quantity: count,
        },
        update: { quantity: { increment: count } },
      })
    )
  );

  return { pulled };
}

export default function OpenPack({ loaderData, actionData }: Route.ComponentProps) {
  const { pack } = loaderData;
  const navigation = useNavigation();
  const opening = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <Link to="/packs" className="text-sm text-indigo-400 hover:underline">
          &larr; Back to booster packs
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{pack.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Released {pack.releaseDate ?? "unknown"}</p>

        <Form method="post" className="mt-6">
          <button
            type="submit"
            disabled={opening}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {opening ? "Opening..." : "Open Pack"}
          </button>
        </Form>

        {actionData?.error && <p className="mt-4 text-sm text-red-400">{actionData.error}</p>}

        {actionData?.pulled && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-gray-300">You pulled:</h2>
            <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-9">
              {actionData.pulled.map((card, i) => (
                <li key={i} className="overflow-hidden rounded-lg border border-gray-800">
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} className="w-full" />
                  ) : (
                    <div className="flex aspect-[59/86] w-full items-center justify-center bg-gray-900 p-2 text-center text-xs text-gray-400">
                      {card.name}
                    </div>
                  )}
                  <p className="bg-gray-900 px-1 py-0.5 text-center text-[10px] text-gray-400">
                    {card.rarity}
                  </p>
                </li>
              ))}
            </ul>
            <Link
              to="/library"
              className="mt-6 inline-block text-sm text-indigo-400 hover:underline"
            >
              View your library &rarr;
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
