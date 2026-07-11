import { PreviousTeamModal } from '../../components/common/PreviousTeamModal';
import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { SelectField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useMatchAvailability } from '../../hooks/useAvailability';
import { useCompletedMatches, useMatch, useSaveTeams, useSetCaptains } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { matchRepository, type TeamAssignment } from '../../repositories/matchRepository';
import { useMatchWorkflowStore } from '../../stores/matchWorkflowStore';
import type { TeamSide } from '../../types/models';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function TeamFormationPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();
  const { data: match } = useMatch(matchId);
  const { data: players = [] } = usePlayers();
  const { data: availability = [] } = useMatchAvailability(matchId);
  const setCaptainsMutation = useSetCaptains();
  const saveTeams = useSaveTeams();
  const { teamAssignments, setPlayerTeam: setStoredPlayerTeam, resetTeams, setSelectedMatchId } = useMatchWorkflowStore();
  const { data: completedMatchesData = [] } = useCompletedMatches();
  const completedMatches = useMemo(() => completedMatchesData.filter((m) => m.id !== matchId), [completedMatchesData, matchId]);
  const hasCompletedMatches = completedMatches.length > 0;
  const [showPreviousTeamModal, setShowPreviousTeamModal] = useState(false);
  const [battingOrders, setBattingOrders] = useState<Record<string, number>>({});

  const [teamACaptainId, setTeamACaptainId] = useState(match?.team_a_captain_id ?? '');
  const [teamBCaptainId, setTeamBCaptainId] = useState(match?.team_b_captain_id ?? '');

  useEffect(() => {
    setSelectedMatchId(matchId || null);
  }, [matchId, setSelectedMatchId]);

  const availableIds = useMemo(() => new Set(availability.filter((item) => item.status === 'available').map((item) => item.player_id)), [availability]);
  const activePlayers = useMemo(() => players.filter((player) => player.status === 'active'), [players]);
  const selectablePlayers = useMemo(() => {
    const available = activePlayers.filter((player) => availableIds.has(player.id));
    return available.length > 0 ? available : activePlayers;
  }, [activePlayers, availableIds]);

  const resolvedTeamACaptainId = teamACaptainId || match?.team_a_captain_id || '';
  const resolvedTeamBCaptainId = teamBCaptainId || match?.team_b_captain_id || '';

  function setPlayerTeam(playerId: string, team: TeamSide | '') {
    setStoredPlayerTeam(playerId, team || null);
  }

  function applyDraft() {
    if (!resolvedTeamACaptainId || !resolvedTeamBCaptainId) return;
    const draft = matchRepository.draftTeams(
      selectablePlayers.map((player) => player.id),
      resolvedTeamACaptainId,
      resolvedTeamBCaptainId
    );
    resetTeams();
    setBattingOrders({});
    draft.forEach((assignment) => setStoredPlayerTeam(assignment.playerId, assignment.team));
  }

  async function handleImportPreviousTeam(previousMatchId: string) {
    const [previousMatch, previousPlayers] = await Promise.all([
      matchRepository.get(previousMatchId),
      matchRepository.listPlayers(previousMatchId)
    ]);
    const selectableIds = new Set(selectablePlayers.map((p) => p.id));
    const importedTeamAssignments: Record<string, TeamSide | null> = {};
    const importedBattingOrders: Record<string, number> = {};
    previousPlayers.forEach((mp) => {
      if (!selectableIds.has(mp.player_id)) return;
      importedTeamAssignments[mp.player_id] = mp.team;
      if (mp.batting_order != null) importedBattingOrders[mp.player_id] = mp.batting_order;
    });
    resetTeams();
    Object.entries(importedTeamAssignments).forEach(([playerId, team]) => setStoredPlayerTeam(playerId, team));
    setBattingOrders(importedBattingOrders);
    setTeamACaptainId(previousMatch.team_a_captain_id ?? '');
    setTeamBCaptainId(previousMatch.team_b_captain_id ?? '');
    setShowPreviousTeamModal(false);
  }

  function buildAssignments(): TeamAssignment[] {
    const orderByTeam: Record<TeamSide, number> = { team_a: 0, team_b: 0 };
    return (selectablePlayers
      .map((player) => {
        const team = player.id === resolvedTeamACaptainId ? 'team_a' : player.id === resolvedTeamBCaptainId ? 'team_b' : teamAssignments[player.id];
        if (team !== 'team_a' && team !== 'team_b') return null;
        orderByTeam[team] += 1;
        return {
          playerId: player.id,
          team,
          battingOrder: battingOrders[player.id] ?? orderByTeam[team],
          isCaptain: player.id === resolvedTeamACaptainId || player.id === resolvedTeamBCaptainId
        };
      })
      .filter((assignment): assignment is TeamAssignment => assignment !== null));
  }

  async function save() {
    if (!matchId || !resolvedTeamACaptainId || !resolvedTeamBCaptainId) return;
    await setCaptainsMutation.mutateAsync({ matchId, teamACaptainId: resolvedTeamACaptainId, teamBCaptainId: resolvedTeamBCaptainId });
    await saveTeams.mutateAsync({ matchId, assignments: buildAssignments() });
    navigate(`/admin/matches/${matchId}/toss`);
  }

  return (
    <div className="space-y-4">
      <PagePanel title="Team Formation">
        <div className="grid gap-3">
          <SelectField label="Team A Captain" value={resolvedTeamACaptainId} onChange={(event) => setTeamACaptainId(event.target.value)}>
            <option value="">Select captain</option>
            {selectablePlayers.map((player) => (
              <option key={player.id} value={player.id} disabled={player.id === resolvedTeamBCaptainId}>
                {player.display_name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Team B Captain" value={resolvedTeamBCaptainId} onChange={(event) => setTeamBCaptainId(event.target.value)}>
            <option value="">Select captain</option>
            {selectablePlayers.map((player) => (
              <option key={player.id} value={player.id} disabled={player.id === resolvedTeamACaptainId}>
                {player.display_name}
              </option>
            ))}
          </SelectField>
          <Button type="button" variant="secondary" disabled={!resolvedTeamACaptainId || !resolvedTeamBCaptainId} onClick={applyDraft}>
            Draft Selection
          </Button>
          {hasCompletedMatches && (
            <Button type="button" variant="secondary" onClick={() => setShowPreviousTeamModal(true)}>
              Use Previous Team
            </Button>
          )}
        </div>
      </PagePanel>

      <PagePanel title="Manual Selection">
        <div className="grid gap-2">
          {selectablePlayers.map((player) => {
            const lockedTeam = player.id === resolvedTeamACaptainId ? 'team_a' : player.id === resolvedTeamBCaptainId ? 'team_b' : null;
            return (
              <div key={player.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                <span className="flex-1 min-w-0 font-medium text-sm truncate">{player.display_name}</span>
                <select
                  className="min-h-10 w-28 shrink-0 rounded-md border border-slate-300 bg-white px-2 text-sm"
                  value={lockedTeam ?? teamAssignments[player.id] ?? ''}
                  disabled={Boolean(lockedTeam)}
                  onChange={(event) => setPlayerTeam(player.id, event.target.value as TeamSide | '')}
                >
                  <option value="">Sit out</option>
                  <option value="team_a">{match?.team_a_name ?? 'Team A'}</option>
                  <option value="team_b">{match?.team_b_name ?? 'Team B'}</option>
                </select>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="button" disabled={saveTeams.isPending || setCaptainsMutation.isPending || buildAssignments().length < 2} onClick={() => void save()}>
            Save Teams
          </Button>
          <Button type="button" variant="secondary" onClick={() => { resetTeams(); setBattingOrders({}); }}>
            Clear
          </Button>
        </div>
        <MutationStatus error={saveTeams.error || setCaptainsMutation.error} success={saveTeams.isSuccess ? 'Teams saved.' : null} />
      </PagePanel>

      <PreviousTeamModal
        isOpen={showPreviousTeamModal}
        onClose={() => setShowPreviousTeamModal(false)}
        onImport={handleImportPreviousTeam}
        matches={completedMatches}
        currentMatchId={matchId}
      />
    </div>
  );
}
