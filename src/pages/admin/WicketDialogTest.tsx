import { useState, useMemo } from 'react';

const STRIKER_ID = 'player-1';
const NON_STRIKER_ID = 'player-2';
const BATTING_SQUAD_IDS = ['player-1', 'player-2', 'player-3', 'player-4'];
const PLAYER_MAP: Record<string, string> = {
  'player-1': 'Darshan',
  'player-2': 'Ravi',
  'player-3': 'Bhuvan',
  'player-4': 'Srikanth',
};

export function WicketDialogTest() {
  const [showWicketForm, setShowWicketForm] = useState(false);

  const dismissedPlayerIds = useMemo(() => new Set<string>(), []);

  const eligibleIncomingBatsmen = useMemo(() => {
    const exclude = new Set<string>();
    exclude.add(STRIKER_ID);
    exclude.add(NON_STRIKER_ID);
    for (const id of dismissedPlayerIds) exclude.add(id);
    return BATTING_SQUAD_IDS.filter((id) => !exclude.has(id));
  }, [dismissedPlayerIds]);

  // Hardcode incomingBatsmanId to the first eligible player
  const incomingBatsmanId = eligibleIncomingBatsmen[0] ?? null;

  // Log the select value and options on every render
  console.log('[TEST RENDER] incomingBatsmanId value for <select>:', JSON.stringify(incomingBatsmanId || ''));
  console.log('[TEST RENDER] eligibleIncomingBatsmen:', eligibleIncomingBatsmen);
  console.log('[TEST RENDER] expected <option value="' + incomingBatsmanId + '"> text:', incomingBatsmanId ? PLAYER_MAP[incomingBatsmanId] : '(empty)');
  console.log('[TEST RENDER] option exists in eligibleList:', incomingBatsmanId ? eligibleIncomingBatsmen.includes(incomingBatsmanId) : 'N/A (no selection)');

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-lg font-bold">Wicket Dialog Test</h2>

      {!showWicketForm && (
        <button
          onClick={() => setShowWicketForm(true)}
          className="rounded-lg bg-red-500 text-white px-4 py-2 font-bold"
        >
          Open Wicket Form
        </button>
      )}

      {showWicketForm && (
        <form
          className="grid gap-3 p-4 border rounded-xl"
          onSubmit={(e) => {
            e.preventDefault();
            console.log('[TEST] Form submitted. incomingBatsmanId=', incomingBatsmanId);
          }}
        >
          <h3 className="font-bold text-red-600">Log Wicket</h3>

          <label className="grid gap-1 text-sm font-medium">
            <span>Incoming Batsman</span>
            <select
              value={incomingBatsmanId || ''}
              onChange={(e) => {
                // Intentionally do nothing — value is hardcoded
                console.log('[TEST] onChange fired (ignored). value=', e.target.value);
              }}
              required
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-800"
            >
              <option value="">Select incoming batsman</option>
              {eligibleIncomingBatsmen.map((id) => (
                <option key={id} value={id}>{PLAYER_MAP[id]}</option>
              ))}
            </select>
          </label>

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-red-500 text-white px-4 py-2 font-bold"
            >
              Save Wicket
            </button>
            <button
              type="button"
              onClick={() => setShowWicketForm(false)}
              className="rounded-lg bg-slate-200 text-slate-700 px-4 py-2 font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
