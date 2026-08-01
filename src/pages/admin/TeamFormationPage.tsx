import { PreviousTeamModal } from '../../components/common/PreviousTeamModal';
import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { SelectField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { Badge } from '../../components/ui/Badge';
import { GlassCard } from '../../components/ui/GlassCard';
import { useMatchAvailability } from '../../hooks/useAvailability';
import { useCompletedMatches, useMatch, useSaveTeams, useSetCaptains } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { matchRepository, type TeamAssignment } from '../../repositories/matchRepository';
import { useMatchWorkflowStore } from '../../stores/matchWorkflowStore';
import type { TeamSide } from '../../types/models';
import { Calendar, Clock, History, MapPin, Shuffle, Users } from 'lucide-react';
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
    return selectablePlayers.flatMap<TeamAssignment>((player) => {
      const team = player.id === resolvedTeamACaptainId ? 'team_a' : player.id === resolvedTeamBCaptainId ? 'team_b' : teamAssignments[player.id];
      if (team !== 'team_a' && team !== 'team_b') return [];
      orderByTeam[team] += 1;
      return [
        {
          playerId: player.id,
          team,
          battingOrder: battingOrders[player.id] ?? orderByTeam[team],
          isCaptain: player.id === resolvedTeamACaptainId || player.id === resolvedTeamBCaptainId
        }
      ];
    });
  }

  async function save() {
    if (!matchId || !resolvedTeamACaptainId || !resolvedTeamBCaptainId) return;
    await setCaptainsMutation.mutateAsync({ matchId, teamACaptainId: resolvedTeamACaptainId, teamBCaptainId: resolvedTeamBCaptainId });
    await saveTeams.mutateAsync({ matchId, assignments: buildAssignments() });
    navigate(`/admin/matches/${matchId}/toss`);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="space-y-4">
      {match && (
        <GlassCard glow="green">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-white">{match.match_name}</h2>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="info">
                  <Clock className="mr-1 h-3 w-3" />
                  {match.overs_per_innings} ov/innings
                </Badge>
                <Badge variant="success">
                  <Users className="mr-1 h-3 w-3" />
                  {match.players_per_team}/team
                </Badge>
                <Badge variant="default">
                  <Calendar className="mr-1 h-3 w-3" />
                  {formatDate(match.match_date)}
                </Badge>
                {match.venue && (
                  <Badge variant="warning">
                    <MapPin className="mr-1 h-3 w-3" />
                    {match.venue}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-base font-semibold">
              <span className="text-accent-blue">{match.team_a_name}</span>
              <span className="text-sm text-slate-400">vs</span>
              <span className="text-accent-warning">{match.team_b_name}</span>
            </div>
          </div>
        </GlassCard>
      )}

      <PagePanel title="Captain Selection">
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
        </div>
      </PagePanel>

      {hasCompletedMatches && (
        <PagePanel title="Previous Team">
          <p className="mb-3 text-sm text-slate-300">Import team assignments and batting order from a recent completed match.</p>
          <Button type="button" variant="secondary" onClick={() => setShowPreviousTeamModal(true)}>
            <History className="mr-2 h-4 w-4" />
            Use Previous Team
          </Button>
        </PagePanel>
      )}

      <PagePanel title="Draft Selection">
        <p className="mb-3 text-sm text-slate-300">Automatically split the remaining players evenly between both teams.</p>
        <Button type="button" variant="secondary" disabled={!resolvedTeamACaptainId || !resolvedTeamBCaptainId} onClick={applyDraft}>
          <Shuffle className="mr-2 h-4 w-4" />
          Draft Selection
        </Button>
      </PagePanel>

      <PagePanel title="Manual Selection">
        <div className="grid gap-2">
          {selectablePlayers.map((player) => {
            const lockedTeam = player.id === resolvedTeamACaptainId ? 'team_a' : player.id === resolvedTeamBCaptainId ? 'team_b' : null;
            return (
              <div key={player.id} className="grid grid-cols-[1fr_9rem] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 shadow-sm backdrop-blur-xl">
                <span className="font-medium text-white/90">{player.display_name}</span>
                <SelectField
                  value={lockedTeam ?? teamAssignments[player.id] ?? ''}
                  disabled={Boolean(lockedTeam)}
                  onChange={(event) => setPlayerTeam(player.id, event.target.value as TeamSide | '')}
                >
                  <option value="">Sit out</option>
                  <option value="team_a">{match?.team_a_name ?? 'Team A'}</option>
                  <option value="team_b">{match?.team_b_name ?? 'Team B'}</option>
                </SelectField>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="button" disabled={saveTeams.isPending || setCaptainsMutation.isPending || buildAssignments().length < 2} onClick={() => void save()}>
            Save Teams
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetTeams();
              setBattingOrders({});
            }}
          >
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
