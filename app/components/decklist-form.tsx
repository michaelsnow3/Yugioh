import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { PRESET_DECKS } from "../lib/preset-decks";

interface DecklistFormProps {
  error?: string;
  submitLabel: string;
  submittingLabel: string;
}

export function DecklistForm({ error, submitLabel, submittingLabel }: DecklistFormProps) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [name, setName] = useState("");
  const [decklist, setDecklist] = useState("");

  function applyPreset(presetId: string) {
    const preset = PRESET_DECKS.find((p) => p.id === presetId);
    if (!preset) return;
    setName(preset.deckName);
    setDecklist(preset.decklist);
  }

  return (
    <>
      <label className="mt-6 flex flex-col gap-1 sm:max-w-xs">
        <span className="text-sm font-medium text-gray-300">
          Or start from a classic deck
        </span>
        <select
          defaultValue=""
          onChange={(e) => {
            applyPreset(e.target.value);
            e.target.value = "";
          }}
          className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white outline-none focus:border-indigo-500"
        >
          <option value="" disabled>
            Choose a duelist...
          </option>
          {PRESET_DECKS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <Form method="post" className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-300">Deck name</span>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white outline-none focus:border-indigo-500"
            placeholder="My Blue-Eyes Deck"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-300">Decklist</span>
          <textarea
            name="decklist"
            required
            rows={16}
            value={decklist}
            onChange={(e) => setDecklist(e.target.value)}
            className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-sm text-white outline-none focus:border-indigo-500"
            placeholder={"#main\n89631139\n89631139\n89631139\n\n#extra\n38033121\n\n!side"}
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 self-start rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </Form>
    </>
  );
}
