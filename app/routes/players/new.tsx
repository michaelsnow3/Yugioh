import { Form, redirect, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/new";
import { SiteNav } from "../../components/site-nav";
import { db } from "../../lib/db.server";
import { commitPlayerSession } from "../../lib/session.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Set Your Name | Duel Arena" }];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!name) {
    return { error: "Enter a name." };
  }

  const player = await db.player.upsert({
    where: { name },
    create: { name },
    update: {},
  });

  return redirect(redirectTo, {
    headers: { "Set-Cookie": await commitPlayerSession(player.id) },
  });
}

export default function NewPlayer({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-2xl font-bold">Who's playing?</h1>
        <p className="mt-2 text-sm text-gray-400">
          Your name identifies your card library. Reusing an existing name picks
          up that library again.
        </p>

        <Form method="post" className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input
            name="name"
            required
            autoFocus
            className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white outline-none focus:border-indigo-500"
            placeholder="Your name"
          />
          {actionData?.error && <p className="text-sm text-red-400">{actionData.error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </Form>
      </main>
    </div>
  );
}
