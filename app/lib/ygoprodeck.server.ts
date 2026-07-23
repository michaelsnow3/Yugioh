const API_BASE = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
const SETS_API = "https://db.ygoprodeck.com/api/v7/cardsets.php";

export interface YgoCard {
  id: number;
  name: string;
  type: string;
  frameType: string;
  card_images: { id: number; image_url: string; image_url_small: string }[];
  card_sets?: { set_name: string; set_code: string; set_rarity: string }[];
}

export interface CardSet {
  set_name: string;
  set_code: string;
  num_of_cards: number;
  tcg_date: string | null;
}

export interface SetCard {
  id: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  frameType: string;
}

// Cards not present in YGOPRODeck's database are dropped rather than
// failing the whole import, since decklists often include typos.
export async function fetchCardsByIds(ids: number[]): Promise<Map<number, YgoCard>> {
  const result = new Map<number, YgoCard>();
  if (ids.length === 0) return result;

  const unique = [...new Set(ids)];
  const url = `${API_BASE}?id=${unique.join(",")}`;
  const res = await fetch(url);
  if (!res.ok) return result;

  const json = (await res.json()) as { data?: YgoCard[] };
  for (const card of json.data ?? []) {
    result.set(card.id, card);
  }
  return result;
}

async function lookupByExactName(name: string): Promise<YgoCard | undefined> {
  const res = await fetch(`${API_BASE}?name=${encodeURIComponent(name)}`);
  if (!res.ok) return undefined;
  const json = (await res.json()) as { data?: YgoCard[] };
  return json.data?.[0];
}

// Falls back to a fuzzy name search so minor punctuation/spacing
// differences from the source decklist don't fail the whole lookup.
async function lookupByFuzzyName(name: string): Promise<YgoCard | undefined> {
  const res = await fetch(`${API_BASE}?fname=${encodeURIComponent(name)}`);
  if (!res.ok) return undefined;
  const json = (await res.json()) as { data?: YgoCard[] };
  return json.data?.[0];
}

export async function fetchCardsByNames(names: string[]): Promise<Map<string, YgoCard>> {
  const result = new Map<string, YgoCard>();
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];

  await Promise.all(
    unique.map(async (name) => {
      const card = (await lookupByExactName(name)) ?? (await lookupByFuzzyName(name));
      if (card) result.set(name.toLowerCase(), card);
    })
  );

  return result;
}

// YGOPRODeck's set/card-pool data barely changes; cache it for the life of
// the server process instead of re-fetching on every pack list/open request.
let allCardSetsCache: CardSet[] | null = null;
const cardsInSetCache = new Map<string, SetCard[]>();

export async function fetchAllCardSets(): Promise<CardSet[]> {
  if (allCardSetsCache) return allCardSetsCache;
  const res = await fetch(SETS_API);
  if (!res.ok) return [];
  allCardSetsCache = (await res.json()) as CardSet[];
  return allCardSetsCache;
}

export async function fetchCardsInSet(setName: string): Promise<SetCard[]> {
  const cached = cardsInSetCache.get(setName);
  if (cached) return cached;

  const res = await fetch(`${API_BASE}?cardset=${encodeURIComponent(setName)}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: YgoCard[] };

  const cards: SetCard[] = (json.data ?? []).map((card) => {
    const printing = card.card_sets?.find((s) => s.set_name === setName);
    return {
      id: card.id,
      name: card.name,
      imageUrl: card.card_images[0]?.image_url_small ?? null,
      rarity: printing?.set_rarity ?? "Common",
      frameType: card.frameType,
    };
  });

  cardsInSetCache.set(setName, cards);
  return cards;
}
