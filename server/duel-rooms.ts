import type {
  CardRef,
  DuelActionPayload,
  DuelStateView,
  MonsterZoneCard,
  PlayerBoardView,
  RoomView,
  SpellTrapZoneCard,
  ZoneSource,
  HiddenCard,
} from "../app/lib/duel-types";
import { ZONE_COUNT } from "../app/lib/duel-types";

export interface DeckCardInput {
  cardId: number;
  name: string;
  imageUrl: string | null;
  frameType: string;
  section: "MAIN" | "EXTRA" | "SIDE";
  quantity: number;
}

interface PlayerLobby {
  playerId: string;
  playerName: string;
  socketId: string | null;
  deckId: string | null;
  deckName: string | null;
  ready: boolean;
}

interface DuelPlayer {
  playerId: string;
  playerName: string;
  deckName: string;
  mainDeck: CardRef[];
  extraDeck: CardRef[];
  hand: CardRef[];
  graveyard: CardRef[];
  monsterZones: (MonsterZoneCard | null)[];
  spellTrapZones: (SpellTrapZoneCard | null)[];
}

interface Room {
  code: string;
  createdAt: number;
  phase: "lobby" | "duel";
  players: PlayerLobby[];
  duel?: Record<string, DuelPlayer>;
}

const rooms = new Map<string, Room>();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createRoom(playerId: string, playerName: string): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    createdAt: Date.now(),
    phase: "lobby",
    players: [{ playerId, playerName, socketId: null, deckId: null, deckName: null, ready: false }],
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function joinRoom(code: string, playerId: string, playerName: string): Room | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Room not found." };

  // Existing members can always rejoin (e.g. after a page refresh),
  // even once the duel is underway - only new joiners are phase/size gated.
  const existing = room.players.find((p) => p.playerId === playerId);
  if (existing) return room;

  if (room.phase !== "lobby") return { error: "That duel has already started." };
  if (room.players.length >= 2) return { error: "Room is full." };

  room.players.push({ playerId, playerName, socketId: null, deckId: null, deckName: null, ready: false });
  return room;
}

export function setSocket(code: string, playerId: string, socketId: string) {
  const room = getRoom(code);
  const player = room?.players.find((p) => p.playerId === playerId);
  if (player) player.socketId = socketId;
}

export function disconnectSocket(socketId: string) {
  for (const room of rooms.values()) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) player.socketId = null;
  }
}

export function setDeck(code: string, playerId: string, deckId: string, deckName: string) {
  const room = getRoom(code);
  const player = room?.players.find((p) => p.playerId === playerId);
  if (!player) return;
  player.deckId = deckId;
  player.deckName = deckName;
  player.ready = false;
}

export function setReady(code: string, playerId: string, ready: boolean) {
  const room = getRoom(code);
  const player = room?.players.find((p) => p.playerId === playerId);
  if (!player) return;
  if (ready && !player.deckId) return;
  player.ready = ready;
}

export function cancelRoom(code: string) {
  rooms.delete(code.toUpperCase());
}

export function bothReady(code: string): boolean {
  const room = getRoom(code);
  return !!room && room.players.length === 2 && room.players.every((p) => p.ready);
}

function expandDeckCards(cards: DeckCardInput[], section: "MAIN" | "EXTRA"): CardRef[] {
  const refs: CardRef[] = [];
  for (const card of cards) {
    if (card.section !== section) continue;
    for (let i = 0; i < card.quantity; i++) {
      refs.push({
        instanceId: crypto.randomUUID(),
        cardId: card.cardId,
        name: card.name,
        imageUrl: card.imageUrl,
        frameType: card.frameType,
      });
    }
  }
  return refs;
}

export function startDuel(code: string, decks: Record<string, DeckCardInput[]>): Room | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Room not found." };
  if (room.players.length !== 2) return { error: "Need two players." };

  const duel: Record<string, DuelPlayer> = {};
  for (const player of room.players) {
    const cards = decks[player.playerId] ?? [];
    duel[player.playerId] = {
      playerId: player.playerId,
      playerName: player.playerName,
      deckName: player.deckName ?? "Deck",
      mainDeck: shuffle(expandDeckCards(cards, "MAIN")),
      extraDeck: expandDeckCards(cards, "EXTRA"),
      hand: [],
      graveyard: [],
      monsterZones: Array(ZONE_COUNT).fill(null),
      spellTrapZones: Array(ZONE_COUNT).fill(null),
    };
  }

  room.phase = "duel";
  room.duel = duel;
  return room;
}

function firstEmptyIndex<T>(zones: (T | null)[]): number {
  return zones.findIndex((z) => z === null);
}

function takeFrom(source: CardRef[], instanceId: string): CardRef | null {
  const idx = source.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return null;
  return source.splice(idx, 1)[0];
}

export interface SearchResult {
  cards: CardRef[];
}

export function applyAction(
  code: string,
  playerId: string,
  action: DuelActionPayload
): { ok: true; searchResult?: SearchResult } | { ok: false; error: string } {
  const room = getRoom(code);
  if (!room || !room.duel) return { ok: false, error: "Duel not active." };
  const me = room.duel[playerId];
  if (!me) return { ok: false, error: "Not a player in this duel." };

  switch (action.type) {
    case "DRAW_CARD": {
      const card = me.mainDeck.shift();
      if (!card) return { ok: false, error: "Deck is empty." };
      me.hand.push(card);
      return { ok: true };
    }

    case "SEARCH_DECK": {
      return { ok: true, searchResult: { cards: me.mainDeck } };
    }

    case "SEARCH_ADD_TO_HAND": {
      const card = takeFrom(me.mainDeck, action.instanceId);
      if (!card) return { ok: false, error: "Card not found in deck." };
      me.hand.push(card);
      return { ok: true };
    }

    case "SEARCH_ADD_TO_GRAVEYARD": {
      const card = takeFrom(me.mainDeck, action.instanceId);
      if (!card) return { ok: false, error: "Card not found in deck." };
      me.graveyard.push(card);
      return { ok: true };
    }

    case "SET_MONSTER":
    case "SUMMON_MONSTER": {
      const zoneIndex = firstEmptyIndex(me.monsterZones);
      if (zoneIndex === -1) return { ok: false, error: "No open monster zone." };
      const zoneSource: ZoneSource = action.source;
      const pool = zoneSource === "hand" ? me.hand : me.extraDeck;
      const card = takeFrom(pool, action.instanceId);
      if (!card) return { ok: false, error: "Card not found." };
      me.monsterZones[zoneIndex] = {
        card,
        position: action.type === "SET_MONSTER" ? "DEF" : "ATK",
        faceDown: action.type === "SET_MONSTER",
      };
      return { ok: true };
    }

    case "DISCARD_CARD": {
      const pool = action.source === "hand" ? me.hand : me.extraDeck;
      const card = takeFrom(pool, action.instanceId);
      if (!card) return { ok: false, error: "Card not found." };
      me.graveyard.push(card);
      return { ok: true };
    }

    case "SET_SPELL_TRAP":
    case "ACTIVATE_SPELL_TRAP_FROM_HAND": {
      const zoneIndex = firstEmptyIndex(me.spellTrapZones);
      if (zoneIndex === -1) return { ok: false, error: "No open spell/trap zone." };
      const card = takeFrom(me.hand, action.instanceId);
      if (!card) return { ok: false, error: "Card not found in hand." };
      me.spellTrapZones[zoneIndex] = {
        card,
        faceDown: action.type === "SET_SPELL_TRAP",
      };
      return { ok: true };
    }

    case "SEND_MONSTER_TO_GY": {
      const zone = me.monsterZones[action.zoneIndex];
      if (!zone) return { ok: false, error: "Zone is empty." };
      me.graveyard.push(zone.card);
      me.monsterZones[action.zoneIndex] = null;
      return { ok: true };
    }

    case "SWITCH_MONSTER_POSITION": {
      const zone = me.monsterZones[action.zoneIndex];
      if (!zone) return { ok: false, error: "Zone is empty." };
      zone.position = zone.position === "ATK" ? "DEF" : "ATK";
      if (zone.position === "ATK") zone.faceDown = false;
      return { ok: true };
    }

    case "ACTIVATE_SET_SPELL_TRAP": {
      const zone = me.spellTrapZones[action.zoneIndex];
      if (!zone) return { ok: false, error: "Zone is empty." };
      zone.faceDown = false;
      return { ok: true };
    }

    case "SEND_SPELL_TRAP_TO_GY": {
      const zone = me.spellTrapZones[action.zoneIndex];
      if (!zone) return { ok: false, error: "Zone is empty." };
      me.graveyard.push(zone.card);
      me.spellTrapZones[action.zoneIndex] = null;
      return { ok: true };
    }

    case "GRAVEYARD_TO_HAND": {
      const card = takeFrom(me.graveyard, action.instanceId);
      if (!card) return { ok: false, error: "Card not found in graveyard." };
      me.hand.push(card);
      return { ok: true };
    }

    case "GRAVEYARD_TO_DECK": {
      const card = takeFrom(me.graveyard, action.instanceId);
      if (!card) return { ok: false, error: "Card not found in graveyard." };
      me.mainDeck.push(card);
      me.mainDeck = shuffle(me.mainDeck);
      return { ok: true };
    }

    default:
      return { ok: false, error: "Unknown action." };
  }
}

function redactMonsterZones(zones: (MonsterZoneCard | null)[], reveal: boolean) {
  return zones.map((zone): MonsterZoneCard | HiddenCard | null => {
    if (!zone) return null;
    if (zone.faceDown && !reveal) return { instanceId: zone.card.instanceId, hidden: true };
    return zone;
  });
}

function redactSpellTrapZones(zones: (SpellTrapZoneCard | null)[], reveal: boolean) {
  return zones.map((zone): SpellTrapZoneCard | HiddenCard | null => {
    if (!zone) return null;
    if (zone.faceDown && !reveal) return { instanceId: zone.card.instanceId, hidden: true };
    return zone;
  });
}

function buildBoardView(player: DuelPlayer, isSelf: boolean): PlayerBoardView {
  return {
    playerId: player.playerId,
    playerName: player.playerName,
    deckName: player.deckName,
    isSelf,
    mainDeckCount: player.mainDeck.length,
    hand: isSelf ? player.hand : player.hand.length,
    extraDeck: isSelf ? player.extraDeck : player.extraDeck.length,
    graveyard: player.graveyard,
    monsterZones: redactMonsterZones(player.monsterZones, isSelf),
    spellTrapZones: redactSpellTrapZones(player.spellTrapZones, isSelf),
  };
}

export function getRoomView(code: string, viewerPlayerId: string): RoomView | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Room not found." };

  const players = room.players.map((p) => ({
    playerId: p.playerId,
    playerName: p.playerName,
    deckId: p.deckId,
    deckName: p.deckName,
    ready: p.ready,
    connected: p.socketId !== null,
  }));

  const view: RoomView = {
    code: room.code,
    phase: room.phase,
    players,
    you: viewerPlayerId,
  };

  if (room.phase === "duel" && room.duel) {
    const me = room.duel[viewerPlayerId];
    const opponentEntry = Object.values(room.duel).find((p) => p.playerId !== viewerPlayerId);
    if (me && opponentEntry) {
      const duelView: DuelStateView = {
        roomCode: room.code,
        self: buildBoardView(me, true),
        opponent: buildBoardView(opponentEntry, false),
      };
      view.duel = duelView;
    }
  }

  return view;
}

export function getSocketId(code: string, playerId: string): string | null {
  const room = getRoom(code);
  return room?.players.find((p) => p.playerId === playerId)?.socketId ?? null;
}

export function getPlayerIds(code: string): string[] {
  const room = getRoom(code);
  return room?.players.map((p) => p.playerId) ?? [];
}
