import { Link } from "react-router";
import type { Route } from "./+types/home";
import { SiteNav } from "../components/site-nav";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Duel Arena" },
    { name: "description", content: "Build decks and duel your friends in real time." },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight">Duel Arena</h1>
        <p className="mt-3 max-w-xl text-gray-400">
          Paste a decklist, build your deck, and duel your friend live from two
          different computers.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Link
            to="/decks"
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-indigo-500 hover:bg-gray-800"
          >
            <h2 className="text-xl font-semibold">Deck Builder</h2>
            <p className="mt-2 text-sm text-gray-400">
              Upload a decklist or browse decks you've already saved.
            </p>
          </Link>

          <Link
            to="/duel"
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-indigo-500 hover:bg-gray-800"
          >
            <h2 className="text-xl font-semibold">Start a Duel</h2>
            <p className="mt-2 text-sm text-gray-400">
              Create or join a room and duel your friend in real time.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
