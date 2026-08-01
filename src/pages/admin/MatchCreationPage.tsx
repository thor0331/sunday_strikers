import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { SelectField, TextAreaField, TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useCreateMatch, useMatch, useUpdateMatch } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useSeasons } from '../../hooks/useSeasons';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState, type FormEvent, useEffect } from 'react';
import type { MatchFormat } from '../../types/models';

export function MatchCreationPage() {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { data: seasons = [] } = useSeasons();
  const { data: players = [] } = usePlayers();
  const createMatch = useCreateMatch();
  const updateMatch = useUpdateMatch();

  const { data: match, isLoading: matchLoading } = useMatch(matchId ?? null);

  const activeSeason = seasons.find((season) => season.is_active);
  const activePlayers = useMemo(() => players.filter((player) => player.status === 'active'), [players]);

  const [matchName, setMatchName] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchNumber, setMatchNumber] = useState('1');
  const [venue, setVenue] = useState('');
  const [overs, setOvers] = useState('6');
  const [playersPerTeam, setPlayersPerTeam] = useState('6');
  const [teamAName, setTeamAName] = useState('Team A');
  const [teamBName, setTeamBName] = useState('Team B');
  const [teamACaptainId, setTeamACaptainId] = useState('');
  const [teamBCaptainId, setTeamBCaptainId] = useState('');
  const [notes, setNotes] = useState('');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('short_boundary');

  useEffect(() => {
    if (match) {
      setMatchName(match.match_name || '');
      setMatchDate(match.match_date || '');
      setMatchNumber(match.match_number ? String(match.match_number) : '');
      setVenue(match.venue || '');
      setOvers(match.overs_per_innings ? String(match.overs_per_innings) : '6');
      setPlayersPerTeam(match.players_per_team ? String(match.players_per_team) : '6');
      setTeamAName(match.team_a_name || 'Team A');
      setTeamBName(match.team_b_name || 'Team B');
      setTeamACaptainId(match.team_a_captain_id || '');
      setTeamBCaptainId(match.team_b_captain_id || '');
      setNotes(match.notes || '');
      setMatchFormat((match.match_format as MatchFormat) || 'short_boundary');
    }
  }, [match]);

  const isStarted = match ? !['draft', 'scheduled', 'teams_created'].includes(match.status) : false;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isStarted) return;

    const payload = {
      season_id: match ? match.season_id : (activeSeason?.id ?? null),
      match_name: matchName.trim(),
      match_date: matchDate,
      match_number: matchNumber ? Number(matchNumber) : null,
      venue: venue.trim() || null,
      overs_per_innings: Number(overs),
      players_per_team: Number(playersPerTeam),
      team_a_name: teamAName.trim() || 'Team A',
      team_b_name: teamBName.trim() || 'Team B',
      team_a_captain_id: teamACaptainId || null,
      team_b_captain_id: teamBCaptainId || null,
      notes: notes.trim() || null,
      match_format: matchFormat,
      status: match ? match.status : (teamACaptainId && teamBCaptainId ? 'scheduled' : 'draft')
    };

    if (matchId) {
      await updateMatch.mutateAsync({ matchId, input: payload });
      navigate('/admin');
    } else {
      const created = await createMatch.mutateAsync(payload);
      navigate(`/admin/matches/${created.id}/teams`);
    }
  }

  if (matchId && matchLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-400 font-medium">Loading match details...</p>
      </div>
    );
  }

  return (
    <PagePanel title={matchId ? 'Edit Match' : 'Create Match'}>
      <form className="grid gap-3" onSubmit={submit}>
        {isStarted && (
          <div className="p-3 bg-amber-400/10 text-amber-300 rounded border border-amber-400/30 text-sm font-semibold">
            Editing is disabled because this match has already started or completed.
          </div>
        )}

        <TextField
          label="Match Name"
          value={matchName}
          onChange={(event) => setMatchName(event.target.value)}
          placeholder="Match 1, Sunday Final, Revenge Match"
          required
          disabled={isStarted}
        />
        <TextField
          label="Match Date"
          type="date"
          value={matchDate}
          onChange={(event) => setMatchDate(event.target.value)}
          required
          disabled={isStarted}
        />
        <TextField
          label="Match Number"
          type="number"
          min="1"
          value={matchNumber}
          onChange={(event) => setMatchNumber(event.target.value)}
          disabled={isStarted}
        />
        <TextField
          label="Venue"
          value={venue}
          onChange={(event) => setVenue(event.target.value)}
          disabled={isStarted}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Overs"
            type="number"
            min="1"
            value={overs}
            onChange={(event) => setOvers(event.target.value)}
            required
            disabled={isStarted}
          />
          <TextField
            label="Players Per Team"
            type="number"
            min="1"
            value={playersPerTeam}
            onChange={(event) => setPlayersPerTeam(event.target.value)}
            required
            disabled={isStarted}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Team A Name"
            value={teamAName}
            onChange={(event) => setTeamAName(event.target.value)}
            disabled={isStarted}
          />
          <TextField
            label="Team B Name"
            value={teamBName}
            onChange={(event) => setTeamBName(event.target.value)}
            disabled={isStarted}
          />
        </div>
        <SelectField
          label="Team A Captain"
          value={teamACaptainId}
          onChange={(event) => setTeamACaptainId(event.target.value)}
          disabled={isStarted}
        >
          <option value="">Select captain</option>
          {activePlayers.map((player) => (
            <option key={player.id} value={player.id} disabled={player.id === teamBCaptainId}>
              {player.display_name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Team B Captain"
          value={teamBCaptainId}
          onChange={(event) => setTeamBCaptainId(event.target.value)}
          disabled={isStarted}
        >
          <option value="">Select captain</option>
          {activePlayers.map((player) => (
            <option key={player.id} value={player.id} disabled={player.id === teamACaptainId}>
              {player.display_name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Match Format"
          value={matchFormat}
          onChange={(event) => setMatchFormat(event.target.value as MatchFormat)}
          disabled={isStarted}
        >
          <option value="short_boundary">Short Boundary Cricket</option>
          <option value="long_boundary">Long Boundary Cricket</option>
        </SelectField>
        <TextAreaField
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={isStarted}
        />

        <div className="flex gap-2">
          <Button disabled={createMatch.isPending || updateMatch.isPending || isStarted}>
            {matchId ? 'Save Match' : 'Create Match'}
          </Button>
          {matchId && (
            <Button type="button" variant="secondary" onClick={() => navigate('/admin')}>
              Cancel
            </Button>
          )}
        </div>

        <MutationStatus
          error={createMatch.error || updateMatch.error}
          success={createMatch.isSuccess || updateMatch.isSuccess ? 'Match saved successfully.' : null}
        />
      </form>
    </PagePanel>
  );
}
