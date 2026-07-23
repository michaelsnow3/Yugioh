import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { isMonsterFrameType } from "../../lib/card-sections";
import type {
  CardRef,
  DuelActionPayload,
  DuelEvent,
  DuelFinishedInfo,
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

const CARD_BACK_URL = "https://ms.yugipedia.com//thumb/e/e5/Back-EN.png/257px-Back-EN.png";

function CardBack() {
  return <img src={CARD_BACK_URL} alt="Face-down card" className="h-full w-full rounded object-cover" />;
}

// Renders its children at the correct footprint: upright, or rotated 90deg
// to represent a defense-position monster lying "sideways" on the field.
// The rotated child is sized calc(100% * 86/59) tall (the exact inverse of
// the portrait aspect ratio) so its footprint after rotation exactly fills
// - and stays centered in - the landscape outer box.
function CardFrame({ sideways, children }: { sideways?: boolean; children: React.ReactNode }) {
  if (sideways) {
    return (
      <div className="relative aspect-[86/59] w-full">
        <div className="absolute left-1/2 top-1/2 aspect-[59/86] h-[calc(100%*86/59)] -translate-x-1/2 -translate-y-1/2 rotate-90">
          {children}
        </div>
      </div>
    );
  }
  return <div className="aspect-[59/86] w-full">{children}</div>;
}

function ActionableCard({
  card,
  quantity,
  faceDown,
  sideways,
  selected,
  onSelect,
  actions,
}: {
  card: CardRef;
  quantity?: number;
  faceDown?: boolean;
  sideways?: boolean;
  selected: boolean;
  onSelect: () => void;
  actions: CardAction[];
}) {
  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="relative cursor-pointer overflow-visible rounded-lg border border-gray-800"
      >
        <CardFrame sideways={sideways}>
          {faceDown ? (
            <CardBack />
          ) : card.imageUrl ? (
            <img src={card.imageUrl} alt={card.name} className="h-full w-full rounded-lg object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-900 p-1 text-center text-[9px] text-gray-400">
              {card.name}
            </div>
          )}
        </CardFrame>
        {quantity !== undefined && quantity > 1 && (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] font-bold">
            x{quantity}
          </span>
        )}
      </div>
      {selected && <CardActionMenu card={card} actions={actions} onClose={onSelect} />}
    </>
  );
}

function CardActionMenu({
  card,
  actions,
  onClose,
}: {
  card: CardRef;
  actions: CardAction[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-xs rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          {card.imageUrl ? (
            <img src={card.imageUrl} alt={card.name} className="w-16 flex-shrink-0 rounded-lg" />
          ) : (
            <div className="flex aspect-[59/86] w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-800 text-center text-[9px] text-gray-400">
              {card.name}
            </div>
          )}
          <span className="text-base font-semibold leading-snug">{card.name}</span>
        </div>
        <div className="flex flex-col gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
              }}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${
                a.danger ? "bg-red-600 hover:bg-red-500" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
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

function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmClassName,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmClassName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        className="w-full max-w-xs rounded-xl border border-gray-700 bg-gray-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-base font-semibold">{title}</h3>
        <p className="mb-4 text-sm text-gray-400">{body}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-800"
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white ${confirmClassName}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function LifePointsModal({
  mode,
  onClose,
  onConfirm,
}: {
  mode: "add" | "subtract";
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-xs rounded-xl border border-gray-700 bg-gray-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-semibold">{mode === "add" ? "Add Life Points" : "Subtract Life Points"}</h3>
        <input
          type="number"
          min="0"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Amount"
          className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const amount = Number(value);
              if (amount > 0) onConfirm(mode === "add" ? amount : -amount);
              onClose();
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white ${
              mode === "add" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {mode === "add" ? "Add" : "Subtract"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VictoryDefeatOverlay({
  finished,
  isWinner,
  rematchReady,
  onRematch,
  onHome,
}: {
  finished: DuelFinishedInfo;
  isWinner: boolean;
  rematchReady: { self: boolean; opponent: boolean };
  onRematch: () => void;
  onHome: () => void;
}) {
  const reasonText =
    finished.reason === "concede"
      ? isWinner
        ? "Your opponent conceded."
        : "You conceded."
      : isWinner
        ? "Your opponent's life points hit zero."
        : "Your life points hit zero.";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/95 p-6 text-center">
      <h1 className={`text-5xl font-black ${isWinner ? "text-emerald-400" : "text-red-500"}`}>
        {isWinner ? "Victory!" : "Defeat"}
      </h1>
      <p className="text-gray-400">{reasonText}</p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onRematch}
          disabled={rematchReady.self}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {rematchReady.self ? "Waiting for opponent..." : "Ready for Rematch"}
        </button>
        {rematchReady.opponent && !rematchReady.self && (
          <p className="text-sm text-amber-300">Your opponent is ready for a rematch!</p>
        )}
        <button
          type="button"
          onClick={onHome}
          className="rounded-lg border border-gray-700 px-6 py-3 font-semibold text-gray-200 hover:bg-gray-800"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

function UtilityToolbar({
  onRollDice,
  onFlipCoin,
  onOpenTokenMenu,
  onToggleReveal,
  revealActive,
  onConcede,
}: {
  onRollDice: () => void;
  onFlipCoin: () => void;
  onOpenTokenMenu: () => void;
  onToggleReveal: () => void;
  revealActive: boolean;
  onConcede: () => void;
}) {
  return (
    <div className="flex flex-shrink-0 flex-col items-center justify-center gap-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRollDice();
        }}
        title="Roll a six-sided die"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-lg hover:bg-gray-800"
      >
        🎲
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onFlipCoin();
        }}
        title="Flip a coin"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-lg hover:bg-gray-800"
      >
        🪙
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenTokenMenu();
        }}
        title="Summon a token"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-lg hover:bg-gray-800"
      >
        🃏
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleReveal();
        }}
        title={revealActive ? "Your hand is revealed - click to hide it again" : "Reveal your hand to your opponent"}
        className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg ${
          revealActive
            ? "border-amber-500 bg-amber-900/50 text-amber-300 ring-2 ring-amber-500"
            : "border-gray-700 bg-gray-900 hover:bg-gray-800"
        }`}
      >
        👁
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onConcede();
        }}
        title="Concede the duel"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-lg hover:bg-red-950"
      >
        🏳️
      </button>
    </div>
  );
}

export function DuelBoard({ duel, code }: DuelBoardProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SelectedKey>(null);
  const [viewingCard, setViewingCard] = useState<{ cardId: number; name: string } | null>(null);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const [searchCards, setSearchCards] = useState<CardRef[] | null>(null);
  const [extraDeckOpen, setExtraDeckOpen] = useState(false);
  const [graveyardView, setGraveyardView] = useState<"self" | "opponent" | null>(null);
  const [banishedView, setBanishedView] = useState<"self" | "opponent" | null>(null);
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);
  const [revealConfirmOpen, setRevealConfirmOpen] = useState(false);
  const [concedeConfirmOpen, setConcedeConfirmOpen] = useState(false);
  const [lifeModal, setLifeModal] = useState<"add" | "subtract" | null>(null);
  const [eventToast, setEventToast] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    function onSearchResult(result: { cards: CardRef[] }) {
      setSearchCards(result.cards);
    }
    function onDuelEvent(event: DuelEvent) {
      if (event.type === "DICE_ROLL") {
        setEventToast(`🎲 ${event.playerName} rolled a ${event.value}!`);
      } else if (event.type === "COIN_FLIP") {
        setEventToast(`🪙 ${event.playerName} flipped ${event.result}!`);
      }
      setTimeout(() => setEventToast(null), 3500);
    }
    socket.on("duel:searchResult", onSearchResult);
    socket.on("duel:event", onDuelEvent);
    return () => {
      socket.off("duel:searchResult", onSearchResult);
      socket.off("duel:event", onDuelEvent);
    };
  }, []);

  function emitAction(action: DuelActionPayload) {
    getSocket().emit("duel:action", { code, playerId: duel.self.playerId, action });
    setSelected(null);
  }

  function closeAllMenus() {
    setSelected(null);
    setDeckMenuOpen(false);
    setTokenMenuOpen(false);
  }

  function handleToggleReveal() {
    if (self.handRevealed) {
      emitAction({ type: "TOGGLE_REVEAL_HAND" });
    } else {
      setRevealConfirmOpen(true);
    }
  }

  function requestRematch() {
    getSocket().emit("room:rematchReady", { code, playerId: self.playerId });
  }

  const self = duel.self;
  const opponent = duel.opponent;
  const selfExtraDeck = self.extraDeck as CardRef[];

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-gray-950 text-white"
      onClick={closeAllMenus}
    >
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center gap-2 overflow-hidden px-3 py-2">
        <UtilityToolbar
          onRollDice={() => emitAction({ type: "ROLL_DICE" })}
          onFlipCoin={() => emitAction({ type: "FLIP_COIN" })}
          onOpenTokenMenu={() => setTokenMenuOpen((v) => !v)}
          onToggleReveal={handleToggleReveal}
          revealActive={self.handRevealed}
          onConcede={() => setConcedeConfirmOpen(true)}
        />

        <div className="flex flex-1 flex-col justify-center gap-2 overflow-hidden">
          <OpponentRow
            opponent={opponent}
            selected={selected}
            setSelected={setSelected}
            onViewCard={setViewingCard}
            onOpenGraveyard={() => setGraveyardView("opponent")}
            onOpenBanished={() => setBanishedView("opponent")}
          />

          <div className="border-t border-dashed border-gray-800" />

          <SelfRow
            self={self}
            selected={selected}
            setSelected={setSelected}
            onViewCard={setViewingCard}
            emitAction={emitAction}
            onOpenDeckMenu={() => setDeckMenuOpen((v) => !v)}
            onOpenExtraDeck={() => setExtraDeckOpen(true)}
            onOpenGraveyard={() => setGraveyardView("self")}
            onOpenBanished={() => setBanishedView("self")}
            onOpenLifeAdd={() => setLifeModal("add")}
            onOpenLifeSubtract={() => setLifeModal("subtract")}
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

          {tokenMenuOpen && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                setTokenMenuOpen(false);
              }}
            >
              <div
                className="flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-900 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-1 text-center text-sm font-semibold text-gray-300">Summon Token</h3>
                <button
                  type="button"
                  onClick={() => {
                    emitAction({ type: "SUMMON_TOKEN", position: "ATK" });
                    setTokenMenuOpen(false);
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
                >
                  Attack Position
                </button>
                <button
                  type="button"
                  onClick={() => {
                    emitAction({ type: "SUMMON_TOKEN", position: "DEF" });
                    setTokenMenuOpen(false);
                  }}
                  className="rounded-lg border border-gray-700 px-4 py-2 font-semibold hover:bg-gray-800"
                >
                  Defense Position
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {eventToast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
          <div className="rounded-full border border-indigo-600 bg-gray-900/95 px-4 py-1.5 text-sm font-semibold text-indigo-200 shadow-lg">
            {eventToast}
          </div>
        </div>
      )}

      {revealConfirmOpen && (
        <ConfirmModal
          title="Reveal your hand?"
          body="Your opponent will be able to see every card in your hand until you turn this off again."
          confirmLabel="Reveal Hand"
          confirmClassName="bg-amber-600 hover:bg-amber-500"
          onCancel={() => setRevealConfirmOpen(false)}
          onConfirm={() => {
            emitAction({ type: "TOGGLE_REVEAL_HAND" });
            setRevealConfirmOpen(false);
          }}
        />
      )}

      {concedeConfirmOpen && (
        <ConfirmModal
          title="Concede the duel?"
          body="You will immediately lose this duel."
          confirmLabel="Concede"
          confirmClassName="bg-red-600 hover:bg-red-500"
          onCancel={() => setConcedeConfirmOpen(false)}
          onConfirm={() => {
            emitAction({ type: "CONCEDE" });
            setConcedeConfirmOpen(false);
          }}
        />
      )}

      {lifeModal && (
        <LifePointsModal
          mode={lifeModal}
          onClose={() => setLifeModal(null)}
          onConfirm={(amount) => emitAction({ type: "ADJUST_LIFE_POINTS", amount })}
        />
      )}

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

      {banishedView && (
        <BanishedModalContent
          isSelf={banishedView === "self"}
          cards={banishedView === "self" ? self.banished : opponent.banished}
          selected={selected}
          setSelected={setSelected}
          onViewCard={setViewingCard}
          onClose={() => setBanishedView(null)}
        />
      )}

      {duel.finished && (
        <VictoryDefeatOverlay
          finished={duel.finished}
          isWinner={duel.finished.winnerId === self.playerId}
          rematchReady={duel.rematchReady}
          onRematch={requestRematch}
          onHome={() => navigate("/")}
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
                        {
                          label: "Banish",
                          onClick: () => emitAction({ type: "BANISH_FROM_GRAVEYARD", instanceId: card.instanceId }),
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

function BanishedModalContent({
  isSelf,
  cards,
  selected,
  setSelected,
  onViewCard,
  onClose,
}: {
  isSelf: boolean;
  cards: CardRef[];
  selected: SelectedKey;
  setSelected: (fn: (prev: SelectedKey) => SelectedKey) => void;
  onViewCard: (card: { cardId: number; name: string }) => void;
  onClose: () => void;
}) {
  return (
    <ZoneModal title={`${isSelf ? "Your" : "Opponent's"} Banished Cards (${cards.length})`} onClose={onClose}>
      {cards.length === 0 ? (
        <p className="mt-4 text-gray-500">Empty.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {cards.map((card) => (
            <li key={card.instanceId}>
              <ActionableCard
                card={card}
                selected={selected === key("banished", card.instanceId)}
                onSelect={() =>
                  setSelected((prev) =>
                    prev === key("banished", card.instanceId) ? null : key("banished", card.instanceId)
                  )
                }
                actions={[{ label: "View Card", onClick: () => onViewCard(card) }]}
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
      className={`flex w-12 flex-col items-center gap-0.5 rounded border p-0.5 text-center ${
        onClick ? "cursor-pointer border-gray-700 hover:bg-gray-800" : "cursor-default border-gray-800"
      } ${glow ? "ring-1 ring-indigo-700" : ""}`}
    >
      <div className="flex aspect-[59/86] w-full items-center justify-center rounded bg-gradient-to-br from-gray-800 to-gray-900 text-xs font-bold text-gray-400">
        {count}
      </div>
      <span className="text-[7px] uppercase tracking-wide text-gray-500">{label}</span>
    </button>
  );
}

function DeckTile({ count, onClick, glow }: { count: number; onClick?: () => void; glow?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={!onClick}
      className={`flex w-12 flex-col items-center gap-0.5 rounded border p-0.5 text-center ${
        onClick ? "cursor-pointer border-gray-700 hover:bg-gray-800" : "cursor-default border-gray-800"
      } ${glow ? "ring-1 ring-indigo-700" : ""}`}
    >
      <div className="relative aspect-[59/86] w-full overflow-hidden rounded">
        {count > 0 ? (
          <>
            <CardBack />
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded bg-white px-1 text-[9px] font-bold text-gray-900">
              {count}
            </span>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-xs font-bold text-gray-400">
            0
          </div>
        )}
      </div>
      <span className="text-[7px] uppercase tracking-wide text-gray-500">Deck</span>
    </button>
  );
}

function GraveyardTile({ cards, onClick }: { cards: CardRef[]; onClick: () => void }) {
  const topCard = cards[cards.length - 1];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex w-12 cursor-pointer flex-col items-center gap-0.5 rounded border border-gray-700 p-0.5 text-center hover:bg-gray-800"
    >
      <div className="relative aspect-[59/86] w-full overflow-hidden rounded">
        {topCard ? (
          <>
            {topCard.imageUrl ? (
              <img src={topCard.imageUrl} alt={topCard.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-900 p-1 text-center text-[8px] text-gray-400">
                {topCard.name}
              </div>
            )}
            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[8px] font-bold text-white">
              {cards.length}
            </span>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-xs font-bold text-gray-400">
            0
          </div>
        )}
      </div>
      <span className="text-[7px] uppercase tracking-wide text-gray-500">GY</span>
    </button>
  );
}

function SideColumn({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-shrink-0 flex-col justify-center gap-1">{children}</div>;
}

function LifePointsControl({ value }: { value: number }) {
  return (
    <span className="rounded border border-gray-700 bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
      {value} LP
    </span>
  );
}

function OpponentRow({
  opponent,
  selected,
  setSelected,
  onViewCard,
  onOpenGraveyard,
  onOpenBanished,
}: {
  opponent: PlayerBoardView;
  selected: SelectedKey;
  setSelected: (fn: (prev: SelectedKey) => SelectedKey) => void;
  onViewCard: (card: { cardId: number; name: string }) => void;
  onOpenGraveyard: () => void;
  onOpenBanished: () => void;
}) {
  const extraCount = opponent.extraDeck as number;
  const handRevealed = Array.isArray(opponent.hand);
  const handCards = handRevealed ? (opponent.hand as CardRef[]) : null;
  const handCount = handCards ? handCards.length : (opponent.hand as number);

  return (
    <section>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold">{opponent.playerName}</h2>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
            {opponent.deckName} &middot; Hand: {handCount}
            {handRevealed && (
              <span className="rounded bg-amber-900/60 px-1 py-0.5 font-semibold text-amber-300">Hand Revealed</span>
            )}
          </span>
          <LifePointsControl value={opponent.lifePoints} />
        </div>
      </div>

      <ul className="mt-0.5 flex flex-wrap gap-0.5 px-1">
        {handCards
          ? handCards.map((card) => (
              <li key={card.instanceId} className="w-8">
                <img src={card.imageUrl ?? undefined} alt={card.name} className="w-full rounded" />
              </li>
            ))
          : Array.from({ length: handCount }).map((_, i) => (
              <li key={i} className="w-8">
                <CardFrame>
                  <CardBack />
                </CardFrame>
              </li>
            ))}
      </ul>

      <div className="mt-1 flex items-stretch gap-2">
        <SideColumn>
          <GraveyardTile cards={opponent.graveyard} onClick={onOpenGraveyard} />
          <SideZoneTile label="Banish" count={opponent.banished.length} onClick={onOpenBanished} />
        </SideColumn>

        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1.5">
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
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
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

        <SideColumn>
          <DeckTile count={opponent.mainDeckCount} />
          <SideZoneTile label="Extra" count={extraCount} />
        </SideColumn>
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
  onOpenBanished,
  onOpenLifeAdd,
  onOpenLifeSubtract,
}: {
  self: PlayerBoardView;
  selected: SelectedKey;
  setSelected: (fn: (prev: SelectedKey) => SelectedKey) => void;
  onViewCard: (card: { cardId: number; name: string }) => void;
  emitAction: (action: DuelActionPayload) => void;
  onOpenDeckMenu: () => void;
  onOpenExtraDeck: () => void;
  onOpenGraveyard: () => void;
  onOpenBanished: () => void;
  onOpenLifeAdd: () => void;
  onOpenLifeSubtract: () => void;
}) {
  const hand = self.hand as CardRef[];

  return (
    <section>
      <div className="flex items-center justify-end gap-1 px-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLifeSubtract();
          }}
          className="flex h-5 w-5 items-center justify-center rounded bg-red-700 text-xs font-bold hover:bg-red-600"
        >
          −
        </button>
        <LifePointsControl value={self.lifePoints} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLifeAdd();
          }}
          className="flex h-5 w-5 items-center justify-center rounded bg-emerald-700 text-xs font-bold hover:bg-emerald-600"
        >
          +
        </button>
      </div>

      <div className="mt-1 flex items-stretch gap-2">
        <SideColumn>
          <GraveyardTile cards={self.graveyard} onClick={onOpenGraveyard} />
          <SideZoneTile label="Banish" count={self.banished.length} onClick={onOpenBanished} />
        </SideColumn>

        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1.5">
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

          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
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
        </div>

        <SideColumn>
          <DeckTile count={self.mainDeckCount} onClick={onOpenDeckMenu} glow />
          <SideZoneTile label="Extra" count={(self.extraDeck as CardRef[]).length} onClick={onOpenExtraDeck} />
        </SideColumn>
      </div>

      <div className="mt-1.5 px-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Your Hand ({hand.length})
        </h3>
        <ul className="mt-1 flex flex-wrap gap-1">
          {hand.map((card) => {
            const monster = isMonsterFrameType(card.frameType);
            return (
              <li key={card.instanceId} className="w-12">
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
    // Every face-down monster is, by construction, in defense position.
    return (
      <CardFrame sideways={kind === "monster"}>
        <CardBack />
      </CardFrame>
    );
  }

  const card = zone.card;
  const faceDown = "faceDown" in zone && zone.faceDown;
  const position = "position" in zone ? zone.position : undefined;
  const sideways = kind === "monster" && position === "DEF";

  if (readOnly) {
    return (
      <>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="relative cursor-pointer overflow-hidden rounded-lg border border-gray-800"
        >
          <CardFrame sideways={sideways}>
            <img src={card.imageUrl ?? undefined} alt={card.name} className="h-full w-full rounded-lg object-cover" />
          </CardFrame>
          {position && (
            <span className="absolute bottom-0.5 left-0.5 rounded bg-black/80 px-1 text-[8px] font-bold">
              {position}
            </span>
          )}
        </div>
        {selected && (
          <CardActionMenu
            card={card}
            actions={[{ label: "View Card", onClick: () => onViewCard(card) }]}
            onClose={onSelect}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative">
      <ActionableCard
        card={card}
        faceDown={faceDown}
        sideways={sideways}
        selected={selected}
        onSelect={onSelect}
        actions={actionsFor ? actionsFor(zone) : []}
      />
      {position && (
        <span className="absolute bottom-0.5 left-0.5 rounded bg-black/80 px-1 text-[8px] font-bold">{position}</span>
      )}
    </div>
  );
}
