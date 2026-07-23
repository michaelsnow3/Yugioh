export type ParsedSection = "MAIN" | "EXTRA" | "SIDE";

export interface ParsedEntry {
  id?: number;
  name?: string;
  quantity: number;
  section: ParsedSection | null;
}

const SECTION_MARKERS: Record<string, ParsedSection> = {
  "#main": "MAIN",
  "#extra": "EXTRA",
  "!side": "SIDE",
};

// Requires an explicit "x" (as documented/advertised in the upload UI) so
// card names that themselves start with a number, like "7 Colored Fish",
// aren't misread as a quantity prefix.
const QTY_PREFIX = /^(\d+)[xX]\s+(.+)$/;

// Accepts either .ydk-style passcode lists (with #main/#extra/!side
// markers) or plain pasted card names, one per line, optionally prefixed
// with a quantity like "3x Blue-Eyes White Dragon".
export function parseDecklist(raw: string): ParsedEntry[] {
  const merged = new Map<string, ParsedEntry>();
  let currentSection: ParsedSection | null = null;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const marker = SECTION_MARKERS[line.toLowerCase()];
    if (marker) {
      currentSection = marker;
      continue;
    }

    if (line.startsWith("#") || line.startsWith("!")) continue;

    let entry: ParsedEntry;
    if (/^\d+$/.test(line)) {
      entry = { id: Number(line), quantity: 1, section: currentSection };
    } else {
      const qtyMatch = line.match(QTY_PREFIX);
      if (qtyMatch) {
        entry = {
          name: qtyMatch[2].trim(),
          quantity: Number(qtyMatch[1]),
          section: currentSection,
        };
      } else {
        entry = { name: line, quantity: 1, section: currentSection };
      }
    }

    const key = `${entry.section ?? ""}:${entry.id ?? entry.name!.toLowerCase()}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += entry.quantity;
    } else {
      merged.set(key, entry);
    }
  }

  return [...merged.values()];
}
