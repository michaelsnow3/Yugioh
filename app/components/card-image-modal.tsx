import { fullCardImageUrl } from "../lib/card-image";

interface CardImageModalProps {
  card: { cardId: number; name: string } | null;
  onClose: () => void;
}

export function CardImageModal({ card, onClose }: CardImageModalProps) {
  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <img
          src={fullCardImageUrl(card.cardId)}
          alt={card.name}
          className="w-full rounded-lg"
        />
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}
