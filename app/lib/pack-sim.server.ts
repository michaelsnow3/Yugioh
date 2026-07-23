import type { SetCard } from "./ygoprodeck.server";

const SUPER_OR_ABOVE_WILDCARD_CHANCE = 0.2;

function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

// Approximates a generic 9-card main-series TCG pack (7 commons, 1
// guaranteed rare-or-better, 1 wildcard slot that's usually common but
// sometimes Super Rare+). Real pull rates per set aren't public, so this is
// a reasonable approximation rather than an authentic reproduction of any
// specific product's odds.
export function openPack(pool: SetCard[]): SetCard[] {
  const commons = pool.filter((c) => c.rarity === "Common");
  const rares = pool.filter((c) => c.rarity === "Rare");
  const superOrAbove = pool.filter((c) => c.rarity !== "Common" && c.rarity !== "Rare");

  const commonPool = commons.length > 0 ? commons : pool;
  const rarePool = rares.length > 0 ? rares : superOrAbove.length > 0 ? superOrAbove : commonPool;
  const superPool = superOrAbove.length > 0 ? superOrAbove : rarePool;

  const pulled: SetCard[] = [];
  for (let i = 0; i < 7; i++) pulled.push(pickRandom(commonPool));
  pulled.push(pickRandom(rarePool));
  pulled.push(Math.random() < SUPER_OR_ABOVE_WILDCARD_CHANCE ? pickRandom(superPool) : pickRandom(commonPool));

  return pulled;
}
