import { useState } from "react";
import { Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/edit";
import { CardImageModal } from "../../components/card-image-modal";
import { SiteNav } from "../../components/site-nav";
import { isExtraDeckCard } from "../../lib/card-sections";
import { db } from "../../lib/db.server";
import { requireOwnedDeck } from "../../lib/deck-ownership.server";
import { requirePlayer } from "../../lib/player.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data ? `Edit ${data.deck.name} | Duel Arena` : "Edit Deck | Duel Arena" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const player = await requirePlayer(request);
  const deck = await requireOwnedDeck(player.id, params.deckId);

  const libraryCards = await db.libraryCard.findMany({
    where: { playerId: player.id },
    orderBy: { name: "asc" },
  });

  return { deck, libraryCards };
}

interface EditableCard {
  cardId: number;
  name: string;
  imageUrl: string | null;
  section: "MAIN" | "EXTRA" | "SIDE";
  quantity: number;
}

export async function action({ request, params }: Route.ActionArgs) {
  const player = await requirePlayer(request);
  await requireOwnedDeck(player.id, params.deckId);
  const formData = await request.formData();
  const cards = JSON.parse(String(formData.get("cards") ?? "[]")) as EditableCard[];

  await db.$transaction([
    db.deckCard.deleteMany({ where: { deckId: params.deckId } }),
    db.deck.update({
      where: { id: params.deckId },
      data: { cards: { create: cards } },
    }),
  ]);

  return redirect(`/decks/${params.deckId}`);
}

const SECTION_LABELS = { MAIN: "Main Deck", EXTRA: "Extra Deck", SIDE: "Side Deck" } as const;

export default function EditDeck({ loaderData }: Route.ComponentProps) {
  const { deck, libraryCards } = loaderData;
  const navigation = useNavigation();
  const saving = navigation.state === "submitting";

  const [deckCards, setDeckCards] = useState<EditableCard[]>(() =>
    deck.cards.map((c) => ({
      cardId: c.cardId,
      name: c.name,
      imageUrl: c.imageUrl,
      section: c.section,
      quantity: c.quantity,
    }))
  );
  const [selected, setSelected] = useState<{ source: "deck" | "library"; cardId: number } | null>(
    null
  );
  const [viewingCard, setViewingCard] = useState<{ cardId: number; name: string } | null>(null);

  function viewCard(cardId: number, name: string) {
    setViewingCard({ cardId, name });
    setSelected(null);
  }

  function isSelected(source: "deck" | "library", cardId: number) {
    return selected?.source === source && selected.cardId === cardId;
  }

  function toggleSelect(source: "deck" | "library", cardId: number) {
    setSelected((prev) =>
      prev?.source === source && prev.cardId === cardId ? null : { source, cardId }
    );
  }

  function removeFromDeck(cardId: number) {
    setDeckCards((prev) => {
      const idx = prev.findIndex((c) => c.cardId === cardId);
      if (idx === -1) return prev;
      const card = prev[idx];
      if (card.quantity > 1) {
        const copy = [...prev];
        copy[idx] = { ...card, quantity: card.quantity - 1 };
        return copy;
      }
      return prev.filter((_, i) => i !== idx);
    });
    setSelected(null);
  }

  function addToDeck(libCard: (typeof libraryCards)[number]) {
    setDeckCards((prev) => {
      const idx = prev.findIndex((c) => c.cardId === libCard.cardId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      const section = isExtraDeckCard(libCard.frameType) ? "EXTRA" : "MAIN";
      return [
        ...prev,
        {
          cardId: libCard.cardId,
          name: libCard.name,
          imageUrl: libCard.imageUrl,
          section,
          quantity: 1,
        },
      ];
    });
    setSelected(null);
  }

  const usedByCardId = new Map<number, number>();
  for (const c of deckCards) usedByCardId.set(c.cardId, (usedByCardId.get(c.cardId) ?? 0) + c.quantity);

  const sections = (["MAIN", "EXTRA", "SIDE"] as const).map((section) => ({
    section,
    cards: deckCards.filter((c) => c.section === section),
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white" onClick={() => setSelected(null)}>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <Link to={`/decks/${deck.id}`} className="text-sm text-indigo-400 hover:underline">
          &larr; Cancel
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Edit {deck.name}</h1>
        <p className="mt-2 text-gray-400">
          Click a card to view it, then remove it from your deck or add it from your library.
          Save when you're done.
        </p>

        <form
          method="post"
          onClick={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            if (deckCards.length === 0 && !confirm("Save an empty deck?")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="cards" value={JSON.stringify(deckCards)} />
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Deck"}
          </button>
        </form>

        <section className="mt-8">
          <h2 className="text-xl font-bold">Your Deck</h2>
          {sections.map(({ section, cards }) =>
            cards.length === 0 ? null : (
              <div key={section} className="mt-6">
                <h3 className="text-sm font-semibold text-gray-400">
                  {SECTION_LABELS[section]} ({cards.reduce((n, c) => n + c.quantity, 0)})
                </h3>
                <ul className="mt-3 grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6">
                  {cards.map((card) => (
                    <li key={card.cardId}>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect("deck", card.cardId);
                        }}
                        className="relative cursor-pointer overflow-hidden rounded-lg border border-gray-800"
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
                        {isSelected("deck", card.cardId) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewCard(card.cardId, card.name);
                              }}
                              className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-600"
                            >
                              View Card
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromDeck(card.cardId);
                              }}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
          {deckCards.length === 0 && <p className="mt-4 text-gray-500">No cards in this deck.</p>}
        </section>

        <section className="mt-12 border-t border-gray-800 pt-8">
          <h2 className="text-xl font-bold">Your Library</h2>
          {libraryCards.length === 0 ? (
            <p className="mt-4 text-gray-500">
              No library cards yet.{" "}
              <Link to="/packs" className="text-indigo-400 hover:underline">
                Open a booster pack
              </Link>{" "}
              to get some.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6">
              {libraryCards.map((libCard) => {
                const left = libCard.quantity - (usedByCardId.get(libCard.cardId) ?? 0);
                const available = left > 0;
                return (
                  <li key={libCard.id}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (available) toggleSelect("library", libCard.cardId);
                      }}
                      className={`relative overflow-hidden rounded-lg border ${
                        available
                          ? "cursor-pointer border-gray-800"
                          : "cursor-not-allowed border-gray-900 opacity-40"
                      }`}
                    >
                      {libCard.imageUrl ? (
                        <img src={libCard.imageUrl} alt={libCard.name} className="w-full" />
                      ) : (
                        <div className="flex aspect-[59/86] w-full items-center justify-center bg-gray-900 p-2 text-center text-xs text-gray-400">
                          {libCard.name}
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-bold">
                        {left}/{libCard.quantity} left
                      </span>
                      {isSelected("library", libCard.cardId) && available && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewCard(libCard.cardId, libCard.name);
                            }}
                            className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-600"
                          >
                            View Card
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToDeck(libCard);
                            }}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
                          >
                            Add to Deck
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <CardImageModal card={viewingCard} onClose={() => setViewingCard(null)} />
    </div>
  );
}
