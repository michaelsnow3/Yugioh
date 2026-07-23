import { isExtraDeckCard } from "./card-sections";
import { db } from "./db.server";
import { parseDecklist } from "./decklist.server";
import { fetchCardsByIds, fetchCardsByNames, type YgoCard } from "./ygoprodeck.server";

export interface ResolvedDeckCard {
  cardId: number;
  name: string;
  imageUrl: string | null;
  section: "MAIN" | "EXTRA" | "SIDE";
  quantity: number;
  frameType: string;
}

export interface ResolveDecklistResult {
  cards: ResolvedDeckCard[];
  unresolved: string[];
  entryCount: number;
}

export async function resolveDecklist(decklist: string): Promise<ResolveDecklistResult> {
  const entries = parseDecklist(decklist);

  const idEntries = entries.filter((e) => e.id !== undefined);
  const nameEntries = entries.filter((e) => e.name !== undefined);

  const [byId, byName] = await Promise.all([
    fetchCardsByIds(idEntries.map((e) => e.id!)),
    fetchCardsByNames(nameEntries.map((e) => e.name!)),
  ]);

  const cards: ResolvedDeckCard[] = [];
  const unresolved: string[] = [];

  for (const entry of entries) {
    const card: YgoCard | undefined = entry.id
      ? byId.get(entry.id)
      : byName.get(entry.name!.toLowerCase());

    if (!card) {
      unresolved.push(entry.name ?? `#${entry.id}`);
      continue;
    }

    cards.push({
      cardId: card.id,
      name: card.name,
      imageUrl: card.card_images[0]?.image_url_small ?? null,
      section: entry.section ?? (isExtraDeckCard(card.frameType) ? "EXTRA" : "MAIN"),
      quantity: entry.quantity,
      frameType: card.frameType,
    });
  }

  return { cards, unresolved, entryCount: entries.length };
}

// DeckCard rows don't store frameType (only DeckCard.section, already
// resolved above), so strip it before handing cards to db.deck.create.
export function toDeckCardInput(cards: ResolvedDeckCard[]) {
  return cards.map(({ cardId, name, imageUrl, section, quantity }) => ({
    cardId,
    name,
    imageUrl,
    section,
    quantity,
  }));
}

// A deck's cards count as owned, so every deck-creation flow (Deck Builder's
// upload, the draft-starter, etc.) should feed them into the player's
// library too - they can then be swapped in/out of any deck.
export async function addCardsToLibrary(playerId: string, cards: ResolvedDeckCard[]) {
  await Promise.all(
    cards.map((card) =>
      db.libraryCard.upsert({
        where: { playerId_cardId: { playerId, cardId: card.cardId } },
        create: {
          playerId,
          cardId: card.cardId,
          name: card.name,
          imageUrl: card.imageUrl,
          frameType: card.frameType,
          quantity: card.quantity,
        },
        update: { quantity: { increment: card.quantity } },
      })
    )
  );
}
