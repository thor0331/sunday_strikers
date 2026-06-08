import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useCreateSeason, useSeasons, useSetActiveSeason, useUpdateSeason } from '../../hooks/useSeasons';
import { useState, type FormEvent } from 'react';

export function SeasonManagementPage() {
  const { data: seasons = [], isLoading } = useSeasons();
  const createSeason = useCreateSeason();
  const updateSeason = useUpdateSeason();
  const setActiveSeason = useSetActiveSeason();
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
            <article key={season.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{season.name}</h3>
                  <p className="text-sm text-slate-500">
                    {season.start_date} {season.end_date ? `to ${season.end_date}` : ''}
                  </p>
                  {season.is_active ? <p className="mt-1 text-sm font-semibold text-field">Active season</p> : null}
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
                </div>
              </div>
            </article>
          ))}
        </div>
        <MutationStatus error={setActiveSeason.error} success={setActiveSeason.isSuccess ? 'Active season updated.' : null} />
      </PagePanel>
    </div>
  );
}
