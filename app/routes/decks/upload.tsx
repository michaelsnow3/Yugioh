import { redirect } from "react-router";
import type { Route } from "./+types/upload";
import { DecklistForm } from "../../components/decklist-form";
import { SiteNav } from "../../components/site-nav";
import { db } from "../../lib/db.server";
import { requirePlayer } from "../../lib/player.server";
import { resolveDecklist, toDeckCardInput } from "../../lib/resolve-decklist.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Upload Deck | Duel Arena" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requirePlayer(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const player = await requirePlayer(request);
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const decklist = String(formData.get("decklist") ?? "");

  if (!name) {
    return { error: "Deck name is required." };
  }

  const { cards, unresolved, entryCount } = await resolveDecklist(decklist);
  if (entryCount === 0) {
    return { error: "Couldn't find any cards in that decklist." };
  }
  if (cards.length === 0) {
    return { error: "None of the cards in that decklist could be found." };
  }

  const deck = await db.deck.create({
    data: { name, playerId: player.id, cards: { create: toDeckCardInput(cards) } },
  });

  if (unresolved.length > 0) {
    // Deck still saved with whatever resolved; surface skipped cards via query param.
    return redirect(`/decks/${deck.id}?skipped=${encodeURIComponent(unresolved.join(", "))}`);
  }

  return redirect(`/decks/${deck.id}`);
}

export default function UploadDeck({ actionData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">Upload Deck</h1>
        <p className="mt-2 text-gray-400">
          Paste a .ydk decklist (with #main / #extra / !side sections) or a
          plain list of card names, one per line. Quantities like{" "}
          <code className="text-gray-300">3x Blue-Eyes White Dragon</code> are
          supported.
        </p>

        <DecklistForm
          error={actionData?.error}
          submitLabel="Save Deck"
          submittingLabel="Saving..."
        />
      </main>
    </div>
  );
}
