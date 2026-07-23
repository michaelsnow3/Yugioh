// Not a .server file: used by both server actions/loaders and the
// client-side deck editor to decide Main vs Extra deck placement.
const EXTRA_DECK_FRAME_TYPES = new Set([
  "fusion",
  "synchro",
  "xyz",
  "link",
  "synchro_pendulum",
  "xyz_pendulum",
  "fusion_pendulum",
]);

export function isExtraDeckCard(frameType: string): boolean {
  return EXTRA_DECK_FRAME_TYPES.has(frameType);
}

// YGOPRODeck's frameType is "spell" or "trap" for non-monster cards, and
// something else (normal, effect, fusion, ritual, ...) for every monster.
export function isMonsterFrameType(frameType: string): boolean {
  return frameType !== "spell" && frameType !== "trap";
}
