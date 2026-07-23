import { Link } from "react-router";
import type { Route } from "./+types/home";
import { SiteNav } from "../../components/site-nav";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Deck Builder | Duel Arena" }];
}

export default function DeckBuilderHome() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-bold">Deck Builder</h1>
        <p className="mt-2 text-gray-400">
          Upload a new decklist or view the decks you've already saved.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Link
            to="/decks/upload"
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-indigo-500 hover:bg-gray-800"
          >
            <h2 className="text-xl font-semibold">Upload Deck</h2>
            <p className="mt-2 text-sm text-gray-400">
              Paste a .ydk list or plain card names to save a new deck.
            </p>
          </Link>

          <Link
            to="/decks/view"
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-indigo-500 hover:bg-gray-800"
          >
            <h2 className="text-xl font-semibold">View Decks</h2>
            <p className="mt-2 text-sm text-gray-400">
              Browse decks you've already uploaded.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
