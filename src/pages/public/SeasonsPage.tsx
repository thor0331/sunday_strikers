import { PagePanel } from '../../components/common/PagePanel';
import { useSeasons } from '../../hooks/useSeasons';

export function SeasonsPage() {
  const { data: seasons = [], isLoading, error } = useSeasons();

  return (
    <PagePanel title="Seasons">
      {isLoading ? <p>Loading seasons...</p> : null}
      {error ? <p className="text-red-700">Unable to load seasons.</p> : null}
      <div className="grid gap-3">
        {seasons.map((season) => (
          <article key={season.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{season.name}</h3>
                <p className="text-sm text-slate-500">
                  {season.start_date} {season.end_date ? `to ${season.end_date}` : ''}
                </p>
              </div>
              {season.is_active ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-field">Active</span> : null}
            </div>
          </article>
        ))}
      </div>
    </PagePanel>
  );
}
