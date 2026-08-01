import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useCreateSeason, useSeasons, useSetActiveSeason, useUpdateSeason, useDeleteSeason } from '../../hooks/useSeasons';
import { useState, type FormEvent } from 'react';

export function SeasonManagementPage() {
  const { data: seasons = [], isLoading } = useSeasons();
  const createSeason = useCreateSeason();
  const updateSeason = useUpdateSeason();
  const setActiveSeason = useSetActiveSeason();
  const deleteSeason = useDeleteSeason();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const input = { name: name.trim(), start_date: startDate, end_date: endDate || null };
    if (editingId) {
      await updateSeason.mutateAsync({ id: editingId, input });
      setEditingId(null);
    } else {
      await createSeason.mutateAsync(input);
    }
    setName('');
    setStartDate('');
    setEndDate('');
  }

  async function handleDeleteSeason(seasonId: string, seasonName: string) {
    const confirmed = window.confirm(
      `Delete Season\n\n` +
      `This will permanently delete "${seasonName}" and ALL data associated with it.\n` +
      `This action cannot be undone.\n\n` +
      `The following will be deleted:\n` +
      `- Season\n` +
      `- Matches\n` +
      `- Team formations\n` +
      `- Toss information\n` +
      `- Innings\n` +
      `- Ball-by-ball events\n` +
      `- Scorecards\n` +
      `- Match statistics\n` +
      `- Player of the Match\n` +
      `- Awards\n` +
      `- Season summaries\n` +
      `- Leaderboards\n` +
      `- Any other match-related data belonging to this season\n\n` +
      `Players should NOT be deleted.`
    );
    if (confirmed) {
      await deleteSeason.mutateAsync(seasonId);
    }
  }

  return (
    <div className="space-y-4">
      <PagePanel title="Manage Seasons">
        <form className="grid gap-3" onSubmit={submit}>
          <TextField label="Season Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <TextField label="Start Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          <TextField label="End Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <div className="flex gap-2">
            <Button disabled={createSeason.isPending || updateSeason.isPending}>{editingId ? 'Save Season' : 'Create Season'}</Button>
            {editingId ? (
              <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            ) : null}
          </div>
          <MutationStatus error={createSeason.error || updateSeason.error} success={createSeason.isSuccess || updateSeason.isSuccess ? 'Season saved.' : null} />
        </form>
      </PagePanel>

      <PagePanel title="Seasons">
        {isLoading ? <p>Loading seasons...</p> : null}
        <div className="grid gap-3">
          {seasons.map((season) => (
            <article key={season.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-sm backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{season.name}</h3>
                  <p className="text-sm text-slate-300">
                    {season.start_date} {season.end_date ? `to ${season.end_date}` : ''}
                  </p>
                  {season.is_active ? <p className="mt-1 text-sm font-semibold text-accent-green">Active season</p> : null}
                </div>
                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingId(season.id);
                      setName(season.name);
                      setStartDate(season.start_date);
                      setEndDate(season.end_date ?? '');
                    }}
                  >
                    Edit
                  </Button>
                  <Button type="button" disabled={season.is_active} onClick={() => void setActiveSeason.mutateAsync(season.id)}>
                    Set Active
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={deleteSeason.isPending}
                    onClick={() => handleDeleteSeason(season.id, season.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <MutationStatus
          error={setActiveSeason.error || deleteSeason.error}
          success={setActiveSeason.isSuccess ? 'Active season updated.' : deleteSeason.isSuccess ? 'Season deleted successfully.' : null}
        />
      </PagePanel>
    </div>
  );
}
