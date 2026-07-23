import { useState } from "react";
import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/deck";
import { CardImageModal } from "../../components/card-image-modal";
import { SiteNav } from "../../components/site-nav";
import { db } from "../../lib/db.server";
import { requireOwnedDeck } from "../../lib/deck-ownership.server";
import { requirePlayer } from "../../lib/player.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data ? `${data.deck.name} | Duel Arena` : "Deck | Duel Arena" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const player = await requirePlayer(request);
  const deck = await requireOwnedDeck(player.id, params.deckId);
  return { deck };
}

export async function action({ request, params }: Route.ActionArgs) {
  const player = await requirePlayer(request);
  await requireOwnedDeck(player.id, params.deckId);
  await db.deck.delete({ where: { id: params.deckId } });
  return redirect("/decks/view");
}

const SECTION_LABELS = { MAIN: "Main Deck", EXTRA: "Extra Deck", SIDE: "Side Deck" } as const;

export default function DeckDetail({ loaderData }: Route.ComponentProps) {
  const { deck } = loaderData;
  const [searchParams] = useSearchParams();
  const skipped = searchParams.get("skipped");
  const navigation = useNavigation();
  const deleting = navigation.state === "submitting";
  const [viewingCard, setViewingCard] = useState<{ cardId: number; name: string } | null>(null);

  const sections = (["MAIN", "EXTRA", "SIDE"] as const).map((section) => ({
    section,
    cards: deck.cards.filter((c) => c.section === section),
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <Link to="/decks/view" className="text-sm text-indigo-400 hover:underline">
          &larr; Back to decks
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <div className="flex gap-3">
            <Link
              to={`/decks/${deck.id}/edit`}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
            >
              Edit Deck
            </Link>
            <Form
              method="post"
              onSubmit={(e) => {
                if (!confirm(`Delete "${deck.name}"? This can't be undone.`)) {
                  e.preventDefault();
                }
              }}
            >
              <button
                type="submit"
                disabled={deleting}
                className="rounded-lg border border-red-900 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Deck"}
              </button>
            </Form>
          </div>
        </div>

        <p className="mt-2 text-sm text-gray-500">Click a card to view it full-size.</p>

        {skipped && (
          <p className="mt-4 rounded-lg border border-yellow-800 bg-yellow-950/50 px-4 py-3 text-sm text-yellow-300">
            Couldn't find: {skipped}
          </p>
        )}

        {sections.map(({ section, cards }) =>
          cards.length === 0 ? null : (
            <section key={section} className="mt-10">
              <h2 className="text-lg font-semibold text-gray-300">
                {SECTION_LABELS[section]} ({cards.reduce((n, c) => n + c.quantity, 0)})
              </h2>
              <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6">
                {cards.map((card) => (
                  <li key={card.id} className="flex flex-col items-center gap-1">
                    <div
                      onClick={() => setViewingCard({ cardId: card.cardId, name: card.name })}
                      className="relative w-full cursor-pointer overflow-hidden rounded-lg border border-gray-800"
                    >
                      {card.imageUrl ? (
                        <img src={card.imageUrl} alt={card.name} className="w-full" />
                      ) : (
                        <div className="flex aspect-[59/86] w-full items-center justify-center bg-gray-900 p-2 text-center text-xs text-gray-400">
                          {card.name}
                        </div>
                      )}
                      {card.quantity > 1 && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-bold">
                          x{card.quantity}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        )}
      </main>

      <CardImageModal card={viewingCard} onClose={() => setViewingCard(null)} />
    </div>
  );
}
