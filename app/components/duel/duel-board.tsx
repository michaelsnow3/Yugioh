import { useEffect, useState } from "react";
import { isMonsterFrameType } from "../../lib/card-sections";
import type {
  CardRef,
  DuelActionPayload,
  DuelStateView,
  HiddenCard,
  MonsterZoneCard,
  PlayerBoardView,
  SpellTrapZoneCard,
} from "../../lib/duel-types";
import { getSocket } from "../../lib/socket-client";
import { CardImageModal } from "../card-image-modal";

interface DuelBoardProps {
  duel: DuelStateView;
  code: string;
}

interface CardAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

type SelectedKey = string | null;

function key(...parts: (string | number)[]) {
  return parts.join(":");
}

function CardBack({ label }: { label?: string }) {
  return (
    <div className="flex aspect-[59/86] w-full items-center justify-center rounded-lg border border-indigo-900 bg-gradient-to-br from-indigo-950 to-gray-900 text-center text-[10px] font-semibold text-indigo-400">
      {label ?? "Duel Arena"}
    </div>
  );
}

function ActionableCard({
  card,
  quantity,
  faceDownBadge,
  selected,
  onSelect,
  actions,
}: {
  card: CardRef;
  quantity?: number;
  faceDownBadge?: boolean;
  selected: boolean;
  onSelect: () => void;
  actions: CardAction[];
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="relative cursor-pointer overflow-hidden rounded-lg border border-gray-800"
    >
      {card.imageUrl ? (
        <img src={card.imageUrl} alt={card.name} className="w-full" />
      ) : (
        <div className="flex aspect-[59/86] w-full items-center justify-center bg-gray-900 p-1 text-center text-[10px] text-gray-400">
          {card.name}
        </div>
      )}
      {faceDownBadge && (
        <span className="absolute left-1 top-1 rounded bg-indigo-950/90 px-1 text-[9px] font-bold text-indigo-300">
          FACE-DOWN
        </span>
      )}
      {quantity !== undefined && quantity > 1 && (
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-bold">
          x{quantity}
        </span>
      )}
      {selected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/85 p-1">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
              }}
              className={`w-full rounded px-1.5 py-1 text-[11px] font-semibold text-white ${
                a.danger ? "bg-red-600 hover:bg-red-500" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ZoneModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DuelBoard({ duel, code }: DuelBoardProps) {
  const [selected, setSelected] = useState<SelectedKey>(null);
  const [viewingCard, setViewingCard] = useState<{ cardId: number; name: string } | null>(null);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const [searchCards, setSearchCards] = useState<CardRef[] | null>(null);
  const [extraDeckOpen, setExtraDeckOpen] = useState(false);
  const [graveyardView, setGraveyardView] = useState<"self" | "opponent" | null>(null);

  useEffect(() => {
    const socket = getSocket();
    function onSearchResult(result: { cards: CardRef[] }) {
      setSearchCards(result.cards);
    }
    socket.on("duel:searchResult", onSearchResult);
    return () => {
      socket.off("duel:searchResult", onSearchResult);
    };
  }, []);

  function emitAction(action: DuelActionPayload) {
    getSocket().emit("duel:action", { code, playerId: duel.self.playerId, action });
    setSelected(null);
  }

  function closeAllMenus() {
    setSelected(null);
    setDeckMenuOpen(false);
  }

  const self = duel.self;
  const opponent = duel.opponent;
  const selfHand = self.hand as CardRef[];
  const selfExtraDeck = self.extraDeck as CardRef[];

  return (
    <div className="min-h-screen bg-gray-950 text-white" onClick={closeAllMenus}>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <OpponentRow
          opponent={opponent}
          selected={selected}
          setSelected={setSelected}
          onViewCard={setViewingCard}
          onOpenGraveyard={() => setGraveyardView("opponent")}
        />

        <div className="my-6 border-t border-dashed border-gray-800" />

        <SelfRow
          self={self}
          selected={selected}
          setSelected={setSelected}
          onViewCard={setViewingCard}
          emitAction={emitAction}
          onOpenDeckMenu={() => setDeckMenuOpen((v) => !v)}
          onOpenExtraDeck={() => setExtraDeckOpen(true)}
          onOpenGraveyard={() => setGraveyardView("self")}
        />

        {deckMenuOpen && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              setDeckMenuOpen(false);
            }}
          >
            <div
              className="flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-900 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  emitAction({ type: "DRAW_CARD" });
                  setDeckMenuOpen(false);
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
              >
                Draw Card
              </button>
              <button
                type="button"
                onClick={() => {
                  emitAction({ type: "SEARCH_DECK" });
                  setDeckMenuOpen(false);
                }}
                className="rounded-lg border border-gray-700 px-4 py-2 font-semibold hover:bg-gray-800"
              >
                Search Deck
              </button>
            </div>
          </div>
        )}
      </main>

      <CardImageModal card={viewingCard} onClose={() => setViewingCard(null)} />

      {searchCards && (
        <ZoneModal title={`Your Deck (${searchCards.length})`} onClose={() => setSearchCards(null)}>
          {searchCards.length === 0 ? (
            <p className="mt-4 text-gray-500">Your deck is empty.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {searchCards.map((card) => (
                <li key={card.instanceId}>
                  <ActionableCard
                    card={card}
                    selected={selected === key("search", card.instanceId)}
                    onSelect={() =>
                      setSelected((prev) =>
                        prev === key("search", card.instanceId) ? null : key("search", card.instanceId)
                      )
                    }
                    actions={[
                      { label: "View Card", onClick: () => setViewingCard(card) },
                      {
                        label: "Add to Hand",
                        onClick: () => {
                          emitAction({ type: "SEARCH_ADD_TO_HAND", instanceId: card.instanceId });
                          setSearchCards((prev) => prev?.filter((c) => c.instanceId !== card.instanceId) ?? null);
                        },
                      },
                      {
                        label: "Add to Graveyard",
                        onClick: () => {
                          emitAction({ type: "SEARCH_ADD_TO_GRAVEYARD", instanceId: card.instanceId });
                          setSearchCards((prev) => prev?.filter((c) => c.instanceId !== card.instanceId) ?? null);
                        },
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </ZoneModal>
      )}

      {extraDeckOpen && (
        <ZoneModal title={`Extra Deck (${selfExtraDeck.length})`} onClose={() => setExtraDeckOpen(false)}>
          {selfExtraDeck.length === 0 ? (
            <p className="mt-4 text-gray-500">Your extra deck is empty.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {selfExtraDeck.map((card) => (
                <li key={card.instanceId}>
                  <ActionableCard
                    card={card}
                    selected={selected === key("extra", card.instanceId)}
                    onSelect={() =>
                      setSelected((prev) =>
                        prev === key("extra", card.instanceId) ? null : key("extra", card.instanceId)
                      )
                    }
                    actions={[
                      { label: "View Card", onClick: () => setViewingCard(card) },
                      {
                        label: "Set",
                        onClick: () => emitAction({ type: "SET_MONSTER", instanceId: card.instanceId, source: "extraDeck" }),
                      },
                      {
                        label: "Summon",
                        onClick: () =>
                          emitAction({ type: "SUMMON_MONSTER", instanceId: card.instanceId, source: "extraDeck" }),
                      },
                      {
                        label: "Discard",
                        onClick: () => emitAction({ type: "DISCARD_CARD", instanceId: card.instanceId, source: "extraDeck" }),
                        danger: true,
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </ZoneModal>
      )}

      {graveyardView && (
        <GraveyardModalContent
          isSelf={graveyardView === "self"}
          cards={graveyardView === "self" ? self.graveyard : opponent.graveyard}
          selected={selected}
          setSelected={setSelected}
          onViewCard={setViewingCard}
          emitAction={emitAction}
          onClose={() => setGraveyardView(null)}
        />
      )}
    </div>
  );
}

function GraveyardModalContent({
  isSelf,
  cards,
  selected,
  setSelected,
  onViewCard,
  emitAction,
  onClose,
}: {
  isSelf: boolean;
  cards: CardRef[];
  selected: SelectedKey;
  setSelected: (fn: (prev: SelectedKey) => SelectedKey) => void;
  onViewCard: (card: { cardId: number; name: string }) => void;
  emitAction: (action: DuelActionPayload) => void;
  onClose: () => void;
}) {
  return (
    <ZoneModal title={`${isSelf ? "Your" : "Opponent's"} Graveyard (${cards.length})`} onClose={onClose}>
      {cards.length === 0 ? (
        <p className="mt-4 text-gray-500">Empty.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {cards.map((card) => (
            <li key={card.instanceId}>
              <ActionableCard
                card={card}
                selected={selected === key("gy", card.instanceId)}
                onSelect={() =>
                  setSelected((prev) => (prev === key("gy", card.instanceId) ? null : key("gy", card.instanceId)))
                }
                actions={
                  isSelf
                    ? [
                        { label: "View Card", onClick: () => onViewCard(card) },
                        {
                          label: "Put in Hand",
                          onClick: () => emitAction({ type: "GRAVEYARD_TO_HAND", instanceId: card.instanceId }),
                        },
                        {
                          label: "Put in Deck",
                          onClick: () => emitAction({ type: "GRAVEYARD_TO_DECK", instanceId: card.instanceId }),
                        },
                      ]
                    : [{ label: "View Card", onClick: () => onViewCard(card) }]
                }
              />
            </li>
          ))}
        </ul>
      )}
    </ZoneModal>
  );
}

function SideZoneTile({
  label,
  count,
  onClick,
  glow,
}: {
  label: string;
  count: number;
  onClick?: () => void;
  glow?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={!onClick}
      className={`flex w-20 flex-col items-center gap-1 rounded-lg border p-2 text-center ${
        onClick ? "cursor-pointer border-gray-700 hover:bg-gray-800" : "cursor-default border-gray-800"
      } ${glow ? "ring-1 ring-indigo-700" : ""}`}
    >
      <div className="flex aspect-[59/86] w-full items-center justify-center rounded bg-gradient-to-br from-gray-800 to-gray-900 text-lg font-bold text-gray-400">
        {count}
      </div>
      <span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
    </button>
  );
}

function OpponentRow({
  opponent,
  selected,
  setSelected,
  onViewCard,
  onOpenGraveyard,
}: {
  opponent: PlayerBoardView;
  selected: SelectedKey;
  setSelected: (fn: (prev: SelectedKey) => SelectedKey) => void;
  onViewCard: (card: { cardId: number; name: string }) => void;
  onOpenGraveyard: () => void;
}) {
  const handCount = opponent.hand as number;
  const extraCount = opponent.extraDeck as number;

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{opponent.playerName}</h2>
        <span className="text-xs text-gray-500">{opponent.deckName}</span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <SideZoneTile label="Deck" count={opponent.mainDeckCount} />
        <SideZoneTile label="Extra" count={extraCount} />
        <SideZoneTile label="Graveyard" count={opponent.graveyard.length} onClick={onOpenGraveyard} />
        <SideZoneTile label="Hand" count={handCount} />

        <div className="ml-4 grid flex-1 grid-cols-5 gap-2">
          {opponent.spellTrapZones.map((zone, i) => (
            <ZoneSlot
              key={i}
              zone={zone}
              kind="spellTrap"
              selected={selected === key("opp-st", i)}
              onSelect={() => setSelected((prev) => (prev === key("opp-st", i) ? null : key("opp-st", i)))}
              onViewCard={onViewCard}
              readOnly
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4">
        <div className="w-20" />
        <div className="w-20" />
        <div className="w-20" />
        <div className="w-20" />
        <div className="ml-4 grid flex-1 grid-cols-5 gap-2">
          {opponent.monsterZones.map((zone, i) => (
            <ZoneSlot
              key={i}
              zone={zone}
              kind="monster"
              selected={selected === key("opp-mon", i)}
              onSelect={() => setSelected((prev) => (prev === key("opp-mon", i) ? null : key("opp-mon", i)))}
              onViewCard={onViewCard}
              readOnly
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SelfRow({
  self,
  selected,
  setSelected,
  onViewCard,
  emitAction,
  onOpenDeckMenu,
  onOpenExtraDeck,
  onOpenGraveyard,
}: {
  self: PlayerBoardView;
  selected: SelectedKey;
  setSelected: (fn: (prev: SelectedKey) => SelectedKey) => void;
  onViewCard: (card: { cardId: number; name: string }) => void;
  emitAction: (action: DuelActionPayload) => void;
  onOpenDeckMenu: () => void;
  onOpenExtraDeck: () => void;
  onOpenGraveyard: () => void;
}) {
  const hand = self.hand as CardRef[];

  return (
    <section>
      <div className="grid grid-cols-5 gap-2">
        {self.monsterZones.map((zone, i) => (
          <ZoneSlot
            key={i}
            zone={zone}
            kind="monster"
            selected={selected === key("self-mon", i)}
            onSelect={() => setSelected((prev) => (prev === key("self-mon", i) ? null : key("self-mon", i)))}
            onViewCard={onViewCard}
            actionsFor={(z) => [
              { label: "View Card", onClick: () => onViewCard((z as MonsterZoneCard).card) },
              {
                label: (z as MonsterZoneCard).position === "ATK" ? "Switch to Defense" : "Switch to Attack",
                onClick: () => emitAction({ type: "SWITCH_MONSTER_POSITION", zoneIndex: i }),
              },
              {
                label: "Send to Graveyard",
                onClick: () => emitAction({ type: "SEND_MONSTER_TO_GY", zoneIndex: i }),
                danger: true,
              },
            ]}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-5 gap-2">
        {self.spellTrapZones.map((zone, i) => (
          <ZoneSlot
            key={i}
            zone={zone}
            kind="spellTrap"
            selected={selected === key("self-st", i)}
            onSelect={() => setSelected((prev) => (prev === key("self-st", i) ? null : key("self-st", i)))}
            onViewCard={onViewCard}
            actionsFor={(z) => {
              const zone = z as SpellTrapZoneCard;
              const actions: CardAction[] = [{ label: "View Card", onClick: () => onViewCard(zone.card) }];
              if (zone.faceDown) {
                actions.push({
                  label: "Activate",
                  onClick: () => emitAction({ type: "ACTIVATE_SET_SPELL_TRAP", zoneIndex: i }),
                });
              }
              actions.push({
                label: "Send to Graveyard",
                onClick: () => emitAction({ type: "SEND_SPELL_TRAP_TO_GY", zoneIndex: i }),
                danger: true,
              });
              return actions;
            }}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <SideZoneTile label="Deck" count={self.mainDeckCount} onClick={onOpenDeckMenu} glow />
        <SideZoneTile label="Extra" count={(self.extraDeck as CardRef[]).length} onClick={onOpenExtraDeck} />
        <SideZoneTile label="Graveyard" count={self.graveyard.length} onClick={onOpenGraveyard} />
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Your Hand ({hand.length})
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {hand.map((card) => {
            const monster = isMonsterFrameType(card.frameType);
            return (
              <li key={card.instanceId} className="w-20">
                <ActionableCard
                  card={card}
                  selected={selected === key("hand", card.instanceId)}
                  onSelect={() =>
                    setSelected((prev) => (prev === key("hand", card.instanceId) ? null : key("hand", card.instanceId)))
                  }
                  actions={[
                    { label: "View Card", onClick: () => onViewCard(card) },
                    monster
                      ? { label: "Set", onClick: () => emitAction({ type: "SET_MONSTER", instanceId: card.instanceId, source: "hand" }) }
                      : {
                          label: "Set",
                          onClick: () => emitAction({ type: "SET_SPELL_TRAP", instanceId: card.instanceId }),
                        },
                    monster
                      ? {
                          label: "Normal Summon",
                          onClick: () => emitAction({ type: "SUMMON_MONSTER", instanceId: card.instanceId, source: "hand" }),
                        }
                      : {
                          label: "Activate",
                          onClick: () => emitAction({ type: "ACTIVATE_SPELL_TRAP_FROM_HAND", instanceId: card.instanceId }),
                        },
                    {
                      label: "Discard",
                      onClick: () => emitAction({ type: "DISCARD_CARD", instanceId: card.instanceId, source: "hand" }),
                      danger: true,
                    },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ZoneSlot({
  zone,
  kind,
  selected,
  onSelect,
  onViewCard,
  actionsFor,
  readOnly,
}: {
  zone: MonsterZoneCard | SpellTrapZoneCard | HiddenCard | null;
  kind: "monster" | "spellTrap";
  selected: boolean;
  onSelect: () => void;
  onViewCard: (card: { cardId: number; name: string }) => void;
  actionsFor?: (zone: MonsterZoneCard | SpellTrapZoneCard) => CardAction[];
  readOnly?: boolean;
}) {
  if (!zone) {
    return <div className="aspect-[59/86] w-full rounded-lg border border-dashed border-gray-800" />;
  }

  if ("hidden" in zone) {
    return <CardBack label={kind === "monster" ? "Set Monster" : "Set"} />;
  }

  const card = zone.card;
  const faceDown = "faceDown" in zone && zone.faceDown;
  const position = "position" in zone ? zone.position : undefined;

  if (readOnly) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="relative cursor-pointer overflow-hidden rounded-lg border border-gray-800"
      >
        <img src={card.imageUrl ?? undefined} alt={card.name} className="w-full" />
        {position && (
          <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1 text-[9px] font-bold">
            {position}
          </span>
        )}
        {selected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/85 p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewCard(card);
              }}
              className="w-full rounded bg-gray-700 px-1.5 py-1 text-[11px] font-semibold hover:bg-gray-600"
            >
              View Card
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <ActionableCard
        card={card}
        faceDownBadge={faceDown}
        selected={selected}
        onSelect={onSelect}
        actions={actionsFor ? actionsFor(zone) : []}
      />
      {position && (
        <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1 text-[9px] font-bold">{position}</span>
      )}
    </div>
  );
}
