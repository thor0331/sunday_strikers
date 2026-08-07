import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { SelectField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useConductToss, useMatch } from '../../hooks/useMatches';
import type { TeamSide, TossDecision } from '../../types/models';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function TossPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();
  const { data: match } = useMatch(matchId);
  const conductToss = useConductToss();
  const [tossWinner, setTossWinner] = useState<TeamSide>('team_a');
  const [decision, setDecision] = useState<TossDecision>('bat');

  async function submit(event: FormEvent) {
    event.preventDefault();
    await conductToss.mutateAsync({ matchId, input: { tossWinner, decision } });
    navigate(`/admin/matches/${matchId}/scoring`);
  }

  return (
    <PagePanel title="Toss">
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Toss Winner" value={tossWinner} onChange={(event) => setTossWinner(event.target.value as TeamSide)}>
            <option value="team_a">{match?.team_a_name ?? 'Team A'}</option>
            <option value="team_b">{match?.team_b_name ?? 'Team B'}</option>
          </SelectField>
          <SelectField label="Decision" value={decision} onChange={(event) => setDecision(event.target.value as TossDecision)}>
            <option value="bat">Bat</option>
            <option value="bowl">Bowl</option>
          </SelectField>
        </div>
        <Button disabled={conductToss.isPending} className="sm:w-auto sm:justify-self-start">
          Save Toss
        </Button>
        <MutationStatus error={conductToss.error} success={conductToss.isSuccess ? 'Toss saved and innings created.' : null} />
      </form>
    </PagePanel>
  );
}
