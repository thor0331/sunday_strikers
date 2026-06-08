import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useMatch, useStartSuperOver } from '../../hooks/useMatches';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function LiveScoringPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading, error } = useMatch(matchId);
  const startSuperOver = useStartSuperOver();
  const [superOverName, setSuperOverName] = useState('Super Over');
  const isCompletedTie = Boolean(match && match.status === 'completed' && match.winner === null && !match.is_super_over);

  async function createSuperOver(event: FormEvent) {
    event.preventDefault();
    if (!match) return;
    const superOver = await startSuperOver.mutateAsync({
      parentMatchId: match.id,
      input: {
        match_name: superOverName.trim(),
        match_date: match.match_date,
        season_id: match.season_id,
        match_number: match.match_number,
        venue: match.venue,
        players_per_team: match.players_per_team,
        team_a_name: match.team_a_name,
        team_b_name: match.team_b_name,
        team_a_captain_id: match.team_a_captain_id,
        team_b_captain_id: match.team_b_captain_id,
        notes: `Super Over for ${match.match_name}`
      }
    });
    navigate(`/admin/matches/${superOver.id}/teams`);
  }

  return (
    <div className="space-y-4">
      <PagePanel title="Live Scoring">
        {isLoading ? <p>Loading match...</p> : null}
        {error ? <p className="text-red-700">Unable to load match.</p> : null}
        {match ? (
          <div className="grid gap-2">
            <h3 className="font-semibold">{match.match_name}</h3>
            <p className="text-sm text-slate-600">
              {match.team_a_name} vs {match.team_b_name}
            </p>
            <p className="text-sm text-slate-600">
              {match.overs_per_innings} overs - {match.status}
            </p>
            {match.toss_winner ? <p className="text-sm text-slate-600">Toss completed. Batting first: {match.batting_first === 'team_a' ? match.team_a_name : match.team_b_name}</p> : null}
          </div>
        ) : null}
      </PagePanel>

      {isCompletedTie ? (
        <PagePanel title="Super Over">
          <form className="grid gap-3" onSubmit={createSuperOver}>
            <TextField label="Super Over Name" value={superOverName} onChange={(event) => setSuperOverName(event.target.value)} required />
            <Button disabled={startSuperOver.isPending}>Start Super Over</Button>
            <MutationStatus error={startSuperOver.error} />
          </form>
        </PagePanel>
      ) : null}
    </div>
  );
}
