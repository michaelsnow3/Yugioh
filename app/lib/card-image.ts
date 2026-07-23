// Card tiles only store the small thumbnail; the full-size image lives at
// this predictable YGOPRODeck URL derived from the card's id.
export function fullCardImageUrl(cardId: number) {
  return `https://images.ygoprodeck.com/images/cards/${cardId}.jpg`;
}
