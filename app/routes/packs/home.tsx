import { Link } from "react-router";
import type { Route } from "./+types/home";
import { SiteNav } from "../../components/site-nav";
import { getSortedBoosterPacks } from "../../lib/booster-packs.server";
import { requirePlayer } from "../../lib/player.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Booster Packs | Duel Arena" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requirePlayer(request);
  const packs = await getSortedBoosterPacks();
  return { packs };
}

export default function PacksHome({ loaderData }: Route.ComponentProps) {
  const { packs } = loaderData;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-sm text-indigo-400 hover:underline">
          &larr; Back to home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Booster Packs</h1>
        <p className="mt-2 text-gray-400">
          {packs.length} real English TCG booster sets, earliest release first. Pulls go
          straight into your library.
        </p>

        <ul className="mt-8 divide-y divide-gray-800 rounded-xl border border-gray-800">
          {packs.map((pack) => (
            <li key={pack.slug}>
              <Link
                to={`/packs/${pack.slug}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-gray-900"
              >
                <span className="font-medium">{pack.name}</span>
                <span className="text-sm text-gray-500">{pack.releaseDate ?? "—"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
