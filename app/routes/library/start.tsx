import { Link, redirect } from "react-router";
import type { Route } from "./+types/start";
import { DecklistForm } from "../../components/decklist-form";
import { SiteNav } from "../../components/site-nav";
import { db } from "../../lib/db.server";
import { requirePlayer } from "../../lib/player.server";
import { addCardsToLibrary, resolveDecklist, toDeckCardInput } from "../../lib/resolve-decklist.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Start Your Draft Deck | Duel Arena" }];
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

  await addCardsToLibrary(player.id, cards);

  const params = new URLSearchParams();
  if (unresolved.length > 0) params.set("skipped", unresolved.join(", "));
  const qs = params.toString();
  return redirect(`/decks/${deck.id}${qs ? `?${qs}` : ""}`);
}

export default function StartDraftDeck({ actionData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/library" className="text-sm text-indigo-400 hover:underline">
          &larr; Back to library
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Start Your Draft Deck</h1>
        <p className="mt-2 text-gray-400">
          Pick a classic starter deck or paste your own decklist. Its cards
          are saved as a deck and added to your library so you can swap them
          around during the draft.
        </p>

        <DecklistForm
          error={actionData?.error}
          submitLabel="Start Draft"
          submittingLabel="Building..."
        />
      </main>
    </div>
  );
}
