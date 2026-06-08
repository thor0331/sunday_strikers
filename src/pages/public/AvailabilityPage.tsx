import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { SelectField, TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useAvailabilityMatches, useMatchAvailability, useSetAvailability } from '../../hooks/useAvailability';
import { usePlayers } from '../../hooks/usePlayers';
import type { AvailabilityStatus } from '../../types/models';
import { useMemo, useState, type FormEvent } from 'react';

export function AvailabilityPage() {
  const { data: matches = [], isLoading: matchesLoading } = useAvailabilityMatches();
  const { data: players = [] } = usePlayers();
  const [matchId, setMatchId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [status, setStatus] = useState<AvailabilityStatus>('available');
  const [note, setNote] = useState('');
  const { data: availability = [] } = useMatchAvailability(matchId || null);
  const setAvailability = useSetAvailability();

  const activePlayers = useMemo(() => players.filter((player) => player.status === 'active'), [players]);
  const availabilityByPlayer = useMemo(() => new Map(availability.map((item) => [item.player_id, item])), [availability]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await setAvailability.mutateAsync({ matchId, playerId, status, note });
    setNote('');
  }

  return (
    <div className="space-y-4">
      <PagePanel title="Availability">
        <form className="grid gap-3" onSubmit={submit}>
          <SelectField label="Match" value={matchId} onChange={(event) => setMatchId(event.target.value)} required>
            <option value="">Select match</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.match_name} - {match.match_date}
              </option>
            ))}
          </SelectField>
          <SelectField label="Player" value={playerId} onChange={(event) => setPlayerId(event.target.value)} required>
            <option value="">Select player</option>
            {activePlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.display_name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as AvailabilityStatus)}>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="maybe">Maybe</option>
          </SelectField>
          <TextField label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
          <Button disabled={!matchId || !playerId || setAvailability.isPending}>Mark Availability</Button>
          <MutationStatus error={setAvailability.error} success={setAvailability.isSuccess ? 'Availability saved.' : null} />
        </form>
      </PagePanel>

      <PagePanel title="Match Availability">
        {matchesLoading ? <p>Loading matches...</p> : null}
        {!matchId ? <p>Select a match to see player availability.</p> : null}
        {matchId ? (
          <div className="grid gap-2">
            {activePlayers.map((player) => {
              const item = availabilityByPlayer.get(player.id);
              return (
                <div key={player.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                  <span className="font-medium">{player.display_name}</span>
                  <span className="text-sm capitalize text-slate-600">{item?.status ?? 'not marked'}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </PagePanel>
    </div>
  );
}
