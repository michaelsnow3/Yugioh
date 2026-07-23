import { db } from "./db.server";

export async function requireOwnedDeck(playerId: string, deckId: string) {
  const deck = await db.deck.findUnique({
    where: { id: deckId },
    include: { cards: { orderBy: { name: "asc" } } },
  });

  if (!deck || deck.playerId !== playerId) {
    throw new Response("Deck not found", { status: 404 });
  }

  return deck;
}
