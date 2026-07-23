import { Link, useRouteLoaderData } from "react-router";

export function SiteNav() {
  const rootData = useRouteLoaderData("root") as { playerName: string | null } | undefined;
  const playerName = rootData?.playerName ?? null;

  return (
    <header className="border-b border-gray-800 bg-gray-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-bold tracking-tight text-white">
          Duel Arena
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-300">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          <Link to="/decks" className="hover:text-white">
            Deck Builder
          </Link>
          <Link to="/packs" className="hover:text-white">
            Packs
          </Link>
          <Link to="/library" className="hover:text-white">
            Library
          </Link>
          <Link to="/duel" className="hover:text-white">
            Duel
          </Link>
          {playerName ? (
            <Link to="/players/new" className="text-gray-400 hover:text-white">
              👤 {playerName}
            </Link>
          ) : (
            <Link
              to="/players/new"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500"
            >
              Set Name
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
