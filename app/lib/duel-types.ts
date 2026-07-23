// Shared between the Socket.IO server (server/*.ts) and the client duel UI.

export interface CardRef {
  instanceId: string;
  cardId: number;
  name: string;
  imageUrl: string | null;
  frameType: string;
}

export type HiddenCard = { instanceId: string; hidden: true };

export interface MonsterZoneCard {
  card: CardRef;
  position: "ATK" | "DEF";
  faceDown: boolean;
}

export interface SpellTrapZoneCard {
  card: CardRef;
  faceDown: boolean;
}

// The server sends each viewer a redacted copy: own hidden info stays a
// real CardRef (with a client-side "hidden" flag for UI purposes only
// where relevant), opponent hidden info becomes a HiddenCard/placeholder
// or a bare count, so nothing secret ever reaches the wrong browser.
export interface PlayerBoardView {
  playerId: string;
  playerName: string;
  deckName: string;
  isSelf: boolean;
  mainDeckCount: number;
  lifePoints: number;
  hand: CardRef[] | number;
  handRevealed: boolean;
  extraDeck: CardRef[] | number;
  graveyard: CardRef[];
  banished: CardRef[];
  monsterZones: (MonsterZoneCard | HiddenCard | null)[];
  spellTrapZones: (SpellTrapZoneCard | HiddenCard | null)[];
}

export interface DuelFinishedInfo {
  winnerId: string;
  reason: "lifePoints" | "concede";
}

export interface DuelStateView {
  roomCode: string;
  self: PlayerBoardView;
  opponent: PlayerBoardView;
  finished: DuelFinishedInfo | null;
  rematchReady: { self: boolean; opponent: boolean };
}

export interface RoomPlayerView {
  playerId: string;
  playerName: string;
  deckId: string | null;
  deckName: string | null;
  ready: boolean;
  connected: boolean;
}

export interface RoomView {
  code: string;
  phase: "lobby" | "duel";
  players: RoomPlayerView[];
  you: string; // your playerId, so the client knows which player entry is "you"
  duel?: DuelStateView;
}

export type ZoneSource = "hand" | "extraDeck";

export type DuelActionPayload =
  | { type: "DRAW_CARD" }
  | { type: "SEARCH_DECK" }
  | { type: "SEARCH_ADD_TO_HAND"; instanceId: string }
  | { type: "SEARCH_ADD_TO_GRAVEYARD"; instanceId: string }
  | { type: "SET_MONSTER"; instanceId: string; source: ZoneSource }
  | { type: "SUMMON_MONSTER"; instanceId: string; source: ZoneSource }
  | { type: "DISCARD_CARD"; instanceId: string; source: ZoneSource }
  | { type: "SET_SPELL_TRAP"; instanceId: string }
  | { type: "ACTIVATE_SPELL_TRAP_FROM_HAND"; instanceId: string }
  | { type: "SEND_MONSTER_TO_GY"; zoneIndex: number }
  | { type: "SWITCH_MONSTER_POSITION"; zoneIndex: number }
  | { type: "ACTIVATE_SET_SPELL_TRAP"; zoneIndex: number }
  | { type: "SEND_SPELL_TRAP_TO_GY"; zoneIndex: number }
  | { type: "GRAVEYARD_TO_HAND"; instanceId: string }
  | { type: "GRAVEYARD_TO_DECK"; instanceId: string }
  | { type: "BANISH_FROM_GRAVEYARD"; instanceId: string }
  | { type: "SUMMON_TOKEN"; position: "ATK" | "DEF" }
  | { type: "TOGGLE_REVEAL_HAND" }
  | { type: "ROLL_DICE" }
  | { type: "FLIP_COIN" }
  | { type: "ADJUST_LIFE_POINTS"; amount: number }
  | { type: "CONCEDE" };

// Ephemeral, non-state-mutating broadcasts (shown as a toast to both
// players) that ride alongside a regular action's room:state update.
export type DuelEvent =
  | { type: "DICE_ROLL"; playerId: string; playerName: string; value: number }
  | { type: "COIN_FLIP"; playerId: string; playerName: string; result: "Heads" | "Tails" };

export const ZONE_COUNT = 5;
