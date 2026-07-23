import { CURATED_BOOSTER_PACK_NAMES } from "./booster-packs";
import { fetchAllCardSets } from "./ygoprodeck.server";

export interface BoosterPack {
  name: string;
  slug: string;
  setCode: string;
  releaseDate: string | null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let sortedPacksCache: BoosterPack[] | null = null;

export async function getSortedBoosterPacks(): Promise<BoosterPack[]> {
  if (sortedPacksCache) return sortedPacksCache;

  const allSets = await fetchAllCardSets();
  const byLowerName = new Map(allSets.map((s) => [s.set_name.trim().toLowerCase(), s]));

  const packs: BoosterPack[] = [];
  for (const name of CURATED_BOOSTER_PACK_NAMES) {
    const set = byLowerName.get(name.trim().toLowerCase());
    if (!set) continue;
    packs.push({
      name: set.set_name,
      slug: slugify(set.set_name),
      setCode: set.set_code,
      releaseDate: set.tcg_date,
    });
  }

  packs.sort((a, b) => (a.releaseDate ?? "9999").localeCompare(b.releaseDate ?? "9999"));
  sortedPacksCache = packs;
  return packs;
}

export async function getBoosterPackBySlug(slug: string): Promise<BoosterPack | undefined> {
  const packs = await getSortedBoosterPacks();
  return packs.find((p) => p.slug === slug);
}
