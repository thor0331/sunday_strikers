import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { SelectField, TextAreaField, TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useCreateMatch } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useSeasons } from '../../hooks/useSeasons';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState, type FormEvent } from 'react';

export function MatchCreationPage() {
  const navigate = useNavigate();
  const { data: seasons = [] } = useSeasons();
  const { data: players = [] } = usePlayers();
  const createMatch = useCreateMatch();
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    const match = await createMatch.mutateAsync({
      season_id: activeSeason?.id ?? null,
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
      status: teamACaptainId && teamBCaptainId ? 'scheduled' : 'draft'
    });
    navigate(`/admin/matches/${match.id}/teams`);
  }

  return (
    <PagePanel title="Create Match">
      <form className="grid gap-3" onSubmit={submit}>
        <TextField label="Match Name" value={matchName} onChange={(event) => setMatchName(event.target.value)} placeholder="Match 1, Sunday Final, Revenge Match" required />
        <TextField label="Match Date" type="date" value={matchDate} onChange={(event) => setMatchDate(event.target.value)} required />
        <TextField label="Match Number" type="number" min="1" value={matchNumber} onChange={(event) => setMatchNumber(event.target.value)} />
        <TextField label="Venue" value={venue} onChange={(event) => setVenue(event.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Overs" type="number" min="1" value={overs} onChange={(event) => setOvers(event.target.value)} required />
          <TextField label="Players Per Team" type="number" min="1" value={playersPerTeam} onChange={(event) => setPlayersPerTeam(event.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Team A Name" value={teamAName} onChange={(event) => setTeamAName(event.target.value)} />
          <TextField label="Team B Name" value={teamBName} onChange={(event) => setTeamBName(event.target.value)} />
        </div>
        <SelectField label="Team A Captain" value={teamACaptainId} onChange={(event) => setTeamACaptainId(event.target.value)}>
          <option value="">Select captain</option>
          {activePlayers.map((player) => (
            <option key={player.id} value={player.id} disabled={player.id === teamBCaptainId}>
              {player.display_name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Team B Captain" value={teamBCaptainId} onChange={(event) => setTeamBCaptainId(event.target.value)}>
          <option value="">Select captain</option>
          {activePlayers.map((player) => (
            <option key={player.id} value={player.id} disabled={player.id === teamACaptainId}>
              {player.display_name}
            </option>
          ))}
        </SelectField>
        <TextAreaField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <Button disabled={createMatch.isPending}>Create Match</Button>
        <MutationStatus error={createMatch.error} />
      </form>
    </PagePanel>
  );
}
