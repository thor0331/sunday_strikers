import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { SelectField, TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import {
  useMatch,
  useInnings,
  useUpdateInnings,
  useCompleteMatch,
  useMatchPlayers,
  useStartSuperOver
} from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import {   useBallEvents, useCreateBallEvent, useUndoLastBall
} from '../../hooks/useBallEvents';
import { useSetMatchInProgress } from '../../hooks/useMatches';
import { emitScoreEvent } from '../../components/common/ScoreAnimation';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import type { BallEvent, TeamSide, ExtraType, WicketType } from '../../types/models';
import { supabase } from '../../services/supabaseClient';
import { useState, type FormEvent, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Undo2, RotateCcw, Skull, ChevronLeft, Target, Gauge, TrendingUp, Zap, Trophy } from 'lucide-react';
import { WinPredictor } from '../../components/common/WinPredictor';

// Helper to determine batting order dynamically
export function determineBattingOrder(
  squadPlayerIds: string[],
  ballEvents: BallEvent[],
  openingStrikerId: string,
  openingNonStrikerId: string,
  incomingBatsmanId: string | null
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  const add = (id: string) => {
    if (squadPlayerIds.includes(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  };

  // 1. Add opening batsmen first
  add(openingStrikerId);
  add(openingNonStrikerId);

  // 2. Add players who have already appeared in events
  const sorted = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  for (const event of sorted) {
    add(event.strikerId);
    add(event.nonStrikerId);
  }

  // 3. Add incoming batsman next if set
  if (incomingBatsmanId) {
    add(incomingBatsmanId);
  }

  // 4. Add remaining squad players who haven't batted yet
  for (const id of squadPlayerIds) {
    add(id);
  }

  return order;
}

export function LiveScoringPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();

  // Queries
  const { data: match, isLoading: matchLoading, error: matchError } = useMatch(matchId);
  const { data: inningsList = [], isLoading: inningsLoading } = useInnings(matchId);
  const { data: matchPlayers = [], isLoading: playersLoading } = useMatchPlayers(matchId);
  const { data: players = [] } = usePlayers();

  // Mutations
  const updateInnings = useUpdateInnings();
  const completeMatch = useCompleteMatch();
  const startSuperOver = useStartSuperOver();
  const setMatchInProgress = useSetMatchInProgress();
  const createBallEvent = useCreateBallEvent();
  const undoLastBall = useUndoLastBall();

  // Innings startup local states
  const [openingStrikerId, setOpeningStrikerId] = useState('');
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState('');
  const [openingBowlerId, setOpeningBowlerId] = useState('');

  // Local state for active bowler & incoming batsman
  const [currentBowlerId, setCurrentBowlerId] = useState<string | null>(null);
  const [incomingBatsmanId, setIncomingBatsmanId] = useState<string | null>(null);

  // Forms visibility states
  const [showWicketForm, setShowWicketForm] = useState(false);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraType | null>(null);

  // Wicket Form states
  const [wicketType, setWicketType] = useState<WicketType>('bowled');
  const [dismissedPlayerId, setDismissedPlayerId] = useState('');
  const [fielderId, setFielderId] = useState('');
  const [wicketRunsBatter, setWicketRunsBatter] = useState('0');
  const [wicketRunsExtra, setWicketRunsExtra] = useState('0');
  const [wicketExtraType, setWicketExtraType] = useState<ExtraType | ''>('');
  const [wicketIsLegal, setWicketIsLegal] = useState(true);

  // Extra Form states
  const [extraRunsBatter, setExtraRunsBatter] = useState('0');
  const [extraRunsExtra, setExtraRunsExtra] = useState('1');

  // Super Over name state
  const [superOverName, setSuperOverName] = useState('Super Over');
  const [playerOfMatchId, setPlayerOfMatchId] = useState('');

  // Maps player ID to display name
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);

  // Determine active innings
  const activeInnings = useMemo(() => {
    if (inningsList.length === 0) return null;
    const inn1 = inningsList.find((i) => i.innings_number === 1);
    const inn2 = inningsList.find((i) => i.innings_number === 2);

    if (inn1 && inn1.status !== 'completed') return inn1;
    if (inn2 && inn2.status !== 'completed') return inn2;
    return null; // Both completed or none active
  }, [inningsList]);

  // Fetch ball events for the active innings
  const { data: ballEvents = [], isLoading: eventsLoading } = useBallEvents(activeInnings?.id ?? null);

  // Batting and Bowling squads for active innings
  const squads = useMemo(() => {
    if (!activeInnings) return { batting: [], bowling: [] };
    const batting = matchPlayers.filter((mp) => mp.team === activeInnings.batting_team);
    const bowling = matchPlayers.filter((mp) => mp.team === activeInnings.bowling_team);
    return { batting, bowling };
  }, [activeInnings, matchPlayers]);

  const battingSquadIds = useMemo(() => squads.batting.map((mp) => mp.player_id), [squads.batting]);
  const bowlingSquadIds = useMemo(() => squads.bowling.map((mp) => mp.player_id), [squads.bowling]);

  const maxWickets = useMemo(() => {
    if (!match) return 0;
    const squadSize = battingSquadIds.length;
    return Math.min(match.players_per_team, squadSize > 0 ? squadSize : match.players_per_team) - 1;
  }, [match, battingSquadIds]);

  // Reconstruct opening batsman if events exist
  const firstEvent = useMemo(() => {
    if (ballEvents.length === 0) return null;
    return [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber)[0];
  }, [ballEvents]);

  const resolvedOpeningStrikerId = firstEvent?.strikerId || openingStrikerId;
  const resolvedOpeningNonStrikerId = firstEvent?.nonStrikerId || openingNonStrikerId;

  // Calculate innings state
  const inningsState = useMemo(() => {
    if (!activeInnings || !match || !resolvedOpeningStrikerId || !resolvedOpeningNonStrikerId) return null;

    const battingOrder = determineBattingOrder(
      battingSquadIds,
      ballEvents,
      resolvedOpeningStrikerId,
      resolvedOpeningNonStrikerId,
      incomingBatsmanId
    );

    const context: ScoringContext = {
      inningsId: activeInnings.id,
      openingStrikerId: resolvedOpeningStrikerId,
      openingNonStrikerId: resolvedOpeningNonStrikerId,
      battingOrder,
      oversPerInnings: match.overs_per_innings,
      playersPerTeam: match.players_per_team,
      targetRuns: activeInnings.target_runs
    };

    try {
      return calculateInningsState(context, ballEvents);
    } catch (err) {
      console.error('Error calculating innings state:', err);
      return null;
    }
  }, [activeInnings, match, resolvedOpeningStrikerId, resolvedOpeningNonStrikerId, battingSquadIds, ballEvents, incomingBatsmanId]);

  // Remaining batsmen who haven't batted yet
  const remainingBatsmen = useMemo(() => {
    if (!inningsState) return battingSquadIds;
    const battedIds = Object.keys(inningsState.battingStats);
    return battingSquadIds.filter((id) => !battedIds.includes(id));
  }, [inningsState, battingSquadIds]);

  // Set opening bowler from first event bowler, or select state
  const lastEvent = useMemo(() => {
    if (ballEvents.length === 0) return null;
    return [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber)[ballEvents.length - 1];
  }, [ballEvents]);

  // Auto-set bowler on load from events
  useEffect(() => {
    if (inningsState?.currentBowlerId) {
      setCurrentBowlerId(inningsState.currentBowlerId);
    } else if (lastEvent?.bowlerId) {
      setCurrentBowlerId(lastEvent.bowlerId);
    } else if (openingBowlerId) {
      setCurrentBowlerId(openingBowlerId);
    }
  }, [inningsState?.currentBowlerId, lastEvent?.bowlerId, openingBowlerId]);

  // Clear incoming batsman once they are in crease and get recorded in next ball event
  useEffect(() => {
    if (incomingBatsmanId && inningsState) {
      const isAtCrease = inningsState.strikerId === incomingBatsmanId || inningsState.nonStrikerId === incomingBatsmanId;
      // If they are at crease and have been saved in ballEvents, we can clear the client-override state
      const hasFacedBall = ballEvents.some((be) => be.strikerId === incomingBatsmanId || be.nonStrikerId === incomingBatsmanId);
      if (isAtCrease && hasFacedBall) {
        setIncomingBatsmanId(null);
      }
    }
  }, [incomingBatsmanId, inningsState, ballEvents]);

  // Handle over completion (block play at over end, clear local bowler to force selection)
  const isOverComplete = useMemo(() => {
    if (!inningsState) return false;
    return inningsState.legalBalls > 0 && inningsState.legalBalls % 6 === 0;
  }, [inningsState]);

  // Detect if we need bowler selection (either start of innings or after over complete)
  const needsBowlerSelection = useMemo(() => {
    if (!inningsState) return false;
    if (ballEvents.length === 0) return !currentBowlerId;
    if (isOverComplete) {
      // If last ball completed the over, we must select a new bowler (different from last event bowler)
      // Check if the currentBowlerId in state is same as the bowler of the last ball
      return !currentBowlerId || currentBowlerId === lastEvent?.bowlerId;
    }
    return !currentBowlerId;
  }, [inningsState, ballEvents, isOverComplete, currentBowlerId, lastEvent]);

  // Start Innings 1 or 2
  async function handleStartInnings(event: FormEvent) {
    event.preventDefault();
    if (!activeInnings || !openingStrikerId || !openingNonStrikerId || !openingBowlerId) return;

    await updateInnings.mutateAsync({
      inningsId: activeInnings.id,
      input: {
        status: 'in_progress',
        started_at: new Date().toISOString()
      }
    });

    // Also set match status to in_progress so public pages see live score
    if (match?.status !== 'in_progress') {
      await setMatchInProgress.mutateAsync(matchId);
    }

    setCurrentBowlerId(openingBowlerId);
  }

  // Log a regular ball
  async function handleLogBall(runsBatter: 0 | 1 | 2 | 3 | 4 | 6) {
    if (!activeInnings || !inningsState || !currentBowlerId) return;

    const overNumber = Math.floor(inningsState.legalBalls / 6);
    const ballInOver = (inningsState.legalBalls % 6) + 1;

    await createBallEvent.mutateAsync({
      input: {
        match_id: matchId,
        innings_id: activeInnings.id,
        over_number: overNumber,
        ball_in_over: ballInOver,
        striker_id: inningsState.strikerId!,
        non_striker_id: inningsState.nonStrikerId!,
        bowler_id: currentBowlerId,
        runs_batter: runsBatter,
        runs_extra: 0,
        extra_type: null,
        is_wicket: false,
        wicket_type: null,
        dismissed_player_id: null,
        fielder_id: null,
        is_legal_delivery: true
      },
      context: {
        inningsId: activeInnings.id,
        openingStrikerId: resolvedOpeningStrikerId,
        openingNonStrikerId: resolvedOpeningNonStrikerId,
        battingOrder: determineBattingOrder(battingSquadIds, ballEvents, resolvedOpeningStrikerId, resolvedOpeningNonStrikerId, incomingBatsmanId),
        oversPerInnings: match!.overs_per_innings,
        playersPerTeam: match!.players_per_team,
        targetRuns: activeInnings.target_runs
      }
    });

    emitScoreEvent('runs', `+${runsBatter}`);
  }

  // Log an Extra ball
  async function handleLogExtra(event: FormEvent) {
    event.preventDefault();
    if (!activeInnings || !inningsState || !currentBowlerId || !selectedExtraType) return;

    const overNumber = Math.floor(inningsState.legalBalls / 6);
    const ballInOver = (inningsState.legalBalls % 6) + 1;
    const runsB = Number(extraRunsBatter);
    const runsEx = Number(extraRunsExtra);
    const isLegal = selectedExtraType === 'bye' || selectedExtraType === 'leg_bye';

    await createBallEvent.mutateAsync({
      input: {
        match_id: matchId,
        innings_id: activeInnings.id,
        over_number: overNumber,
        ball_in_over: ballInOver,
        striker_id: inningsState.strikerId!,
        non_striker_id: inningsState.nonStrikerId!,
        bowler_id: currentBowlerId,
        runs_batter: runsB as any,
        runs_extra: runsEx,
        extra_type: selectedExtraType,
        is_wicket: false,
        wicket_type: null,
        dismissed_player_id: null,
        fielder_id: null,
        is_legal_delivery: isLegal
      },
      context: {
        inningsId: activeInnings.id,
        openingStrikerId: resolvedOpeningStrikerId,
        openingNonStrikerId: resolvedOpeningNonStrikerId,
        battingOrder: determineBattingOrder(battingSquadIds, ballEvents, resolvedOpeningStrikerId, resolvedOpeningNonStrikerId, incomingBatsmanId),
        oversPerInnings: match!.overs_per_innings,
        playersPerTeam: match!.players_per_team,
        targetRuns: activeInnings.target_runs
      }
    });

    setShowExtraForm(false);
    setSelectedExtraType(null);
    setExtraRunsBatter('0');
    setExtraRunsExtra('1');
  }

  // Log a Wicket
  async function handleLogWicket(event: FormEvent) {
    event.preventDefault();
    if (!activeInnings || !inningsState || !currentBowlerId || !dismissedPlayerId) return;

    const overNumber = Math.floor(inningsState.legalBalls / 6);
    const ballInOver = (inningsState.legalBalls % 6) + 1;
    const runsB = Number(wicketRunsBatter);
    const runsEx = Number(wicketRunsExtra);
    const exType = wicketExtraType || null;

    // Determine incoming batsman next
    const newWickets = inningsState.wickets + 1;
    const isAllOut = newWickets >= maxWickets;

    // Only require incoming batsman selection if it's NOT all-out AND there are remaining batsmen
    if (!isAllOut && remainingBatsmen.length > 0 && !incomingBatsmanId) {
      alert('Please select an incoming batsman for the next delivery.');
      return;
    }

    await createBallEvent.mutateAsync({
      input: {
        match_id: matchId,
        innings_id: activeInnings.id,
        over_number: overNumber,
        ball_in_over: ballInOver,
        striker_id: inningsState.strikerId!,
        non_striker_id: inningsState.nonStrikerId!,
        bowler_id: currentBowlerId,
        runs_batter: runsB as any,
        runs_extra: runsEx,
        extra_type: exType,
        is_wicket: true,
        wicket_type: wicketType,
        dismissed_player_id: dismissedPlayerId,
        fielder_id: fielderId || null,
        is_legal_delivery: wicketIsLegal
      },
      context: {
        inningsId: activeInnings.id,
        openingStrikerId: resolvedOpeningStrikerId,
        openingNonStrikerId: resolvedOpeningNonStrikerId,
        battingOrder: determineBattingOrder(battingSquadIds, ballEvents, resolvedOpeningStrikerId, resolvedOpeningNonStrikerId, incomingBatsmanId),
        oversPerInnings: match!.overs_per_innings,
        playersPerTeam: match!.players_per_team,
        targetRuns: activeInnings.target_runs
      }
    });

    emitScoreEvent('wicket', 'WICKET');

    setShowWicketForm(false);
    setWicketType('bowled');
    setDismissedPlayerId('');
    setFielderId('');
    setWicketRunsBatter('0');
    setWicketRunsExtra('0');
    setWicketExtraType('');
    setWicketIsLegal(true);
  }

  // Undo Last Delivery
  async function handleUndo() {
    if (!activeInnings || ballEvents.length === 0 || !inningsState) return;

    if (window.confirm('Delete the last ball?')) {
      await undoLastBall.mutateAsync({
        inningsId: activeInnings.id,
        context: {
          inningsId: activeInnings.id,
          openingStrikerId: resolvedOpeningStrikerId,
          openingNonStrikerId: resolvedOpeningNonStrikerId,
          battingOrder: determineBattingOrder(battingSquadIds, ballEvents, resolvedOpeningStrikerId, resolvedOpeningNonStrikerId, incomingBatsmanId),
          oversPerInnings: match!.overs_per_innings,
          playersPerTeam: match!.players_per_team,
          targetRuns: activeInnings.target_runs
        }
      });
      // Clear local states that might be stale
      setIncomingBatsmanId(null);
    }
  }

  // Complete Innings 1
  async function handleCompleteInnings1() {
    if (!activeInnings || !inningsState || activeInnings.innings_number !== 1) return;

    if (window.confirm('Complete Innings 1 and calculate target?')) {
      const targetRuns = inningsState.totalRuns + 1;

      // 1. Complete Innings 1 in database
      await updateInnings.mutateAsync({
        inningsId: activeInnings.id,
        input: {
          status: 'completed',
          completed_at: new Date().toISOString()
        }
      });

      // 2. Find Innings 2 and set its target
      const innings2 = inningsList.find((i) => i.innings_number === 2);
      if (innings2) {
        await updateInnings.mutateAsync({
          inningsId: innings2.id,
          input: {
            target_runs: targetRuns
          }
        });
      }

      // Reset opening batsman choices for Innings 2
      setOpeningStrikerId('');
      setOpeningNonStrikerId('');
      setOpeningBowlerId('');
      setCurrentBowlerId(null);
      setIncomingBatsmanId(null);
    }
  }

  // Complete Innings 2 and final match results
  async function handleCompleteInnings2() {
    const innings2 = activeInnings;
    if (!innings2 || !inningsState || innings2.innings_number !== 2 || !match) return;

    if (window.confirm('Complete Innings 2 and calculate match result?')) {
      // 1. Complete Innings 2 in database
      await updateInnings.mutateAsync({
        inningsId: innings2.id,
        input: {
          status: 'completed',
          completed_at: new Date().toISOString()
        }
      });

      // 2. Get the actual Innings 1 score by recalculating from ball events
      const innings1 = inningsList.find((i) => i.innings_number === 1);
      let innings1Runs = 0;

      if (innings1) {
        // Fetch Innings 1 ball events and recalculate its state
        try {
          const inn1Events = await supabase
            .from('ball_events')
            .select('*')
            .eq('innings_id', innings1.id)
            .order('sequence_number', { ascending: true });

          if (inn1Events.data && inn1Events.data.length > 0) {
            // Map database rows to BallEvent interface
            const events = inn1Events.data.map((row) => ({
              id: row.id,
              matchId: row.match_id,
              inningsId: row.innings_id,
              sequenceNumber: row.sequence_number,
              overNumber: row.over_number,
              ballInOver: row.ball_in_over,
              strikerId: row.striker_id,
              nonStrikerId: row.non_striker_id,
              bowlerId: row.bowler_id,
              runsBatter: row.runs_batter,
              runsExtra: row.runs_extra,
              extraType: row.extra_type,
              isWicket: row.is_wicket,
              wicketType: row.wicket_type,
              dismissedPlayerId: row.dismissed_player_id,
              fielderId: row.fielder_id,
              isLegalDelivery: row.is_legal_delivery,
              notes: row.notes,
              createdBy: row.created_by,
              createdAt: row.created_at
            } as BallEvent));

            // Get the first ball to determine opening batsmen for Innings 1
            const firstEvent = events[0];
            const inn1BattingSquad = matchPlayers.filter((mp) => mp.team === innings1.batting_team);
            const inn1BattingOrder = inn1BattingSquad.map((mp) => mp.player_id);

            const inn1Context: ScoringContext = {
              inningsId: innings1.id,
              openingStrikerId: firstEvent.strikerId,
              openingNonStrikerId: firstEvent.nonStrikerId,
              battingOrder: inn1BattingOrder,
              oversPerInnings: match.overs_per_innings,
              playersPerTeam: match.players_per_team,
              targetRuns: null
            };

            const inn1State = calculateInningsState(inn1Context, events);
            innings1Runs = inn1State.totalRuns;

            console.log('[Match Completion] Innings 1 calculated runs:', innings1Runs);
          }
        } catch (error) {
          console.error('[Match Completion] Error fetching Innings 1 data:', error);
          // Fall back to target_runs - 1 if we can't fetch
          innings1Runs = innings1.target_runs ? innings1.target_runs - 1 : 0;
        }
      }

      const innings2Runs = inningsState.totalRuns;

      let winner: TeamSide | null = null;
      let resultText = '';

      console.log('[Match Completion] Comparing scores - Innings 1:', innings1Runs, 'Innings 2:', innings2Runs, 'Target:', innings2.target_runs);

      if (innings2Runs >= innings2.target_runs!) {
        // Innings 2 won (Chasing team)
        winner = innings2.batting_team;
        const wicketsLeft = maxWickets - inningsState.wickets;
        const teamName = winner === 'team_a' ? match.team_a_name : match.team_b_name;
        resultText = `${teamName} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
      } else if (innings2Runs < innings1Runs) {
        // Innings 1 won (Defending team)
        winner = innings1!.batting_team;
        const runsMargin = innings1Runs - innings2Runs;
        const teamName = winner === 'team_a' ? match.team_a_name : match.team_b_name;
        resultText = `${teamName} won by ${runsMargin} run${runsMargin !== 1 ? 's' : ''}`;
      } else {
        // TIE - requires Super Over
        winner = null;
        resultText = 'Match tied';
      }

      console.log('[Match Completion] Result:', resultText, 'Winner:', winner);

      // 3. Update match in database
      await completeMatch.mutateAsync({
        matchId: match.id,
        winner,
        resultText,
        playerOfMatchId: playerOfMatchId || null
      });
    }
  }

  // Super Over child match creation
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

  // Auto-fill wicket dismissed player options
  useEffect(() => {
    if (showWicketForm && inningsState) {
      setDismissedPlayerId(inningsState.strikerId || '');
    }
  }, [showWicketForm, inningsState]);

  // Loading states
  const isLoading = matchLoading || inningsLoading || playersLoading || eventsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          <p className="text-slate-500 font-medium">Loading scoring details...</p>
        </div>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700 max-w-lg mx-auto mt-8 text-center">
        <p className="font-semibold text-lg">Unable to load match scoring data.</p>
      </div>
    );
  }

  // Render Completed Match state
  const isMatchCompleted = match.status === 'completed';

  if (isMatchCompleted) {
    const isTie = match.winner === null && !match.is_super_over;
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="rounded-xl bg-gradient-to-b from-teal-50 to-white border border-teal-200 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-800">{match.match_name}</h2>
          <p className="text-sm text-slate-500 mt-1">{match.team_a_name} vs {match.team_b_name}</p>
          <div className="mt-4 rounded-lg bg-teal-50 border border-teal-200 p-3">
            <p className="text-lg font-bold text-teal-700">{match.result_text || 'Match Completed'}</p>
          </div>
          <div className="mt-5">
            <Button onClick={() => navigate('/admin')}>Return to Dashboard</Button>
          </div>
        </div>

        {isTie ? (
          <PagePanel title="Super Over Required">
            <form className="grid gap-4" onSubmit={createSuperOver}>
              <p className="text-sm text-slate-500">
                This match ended in a tie. You can start a Super Over to determine the winner.
              </p>
              <TextField
                label="Super Over Name"
                value={superOverName}
                onChange={(event) => setSuperOverName(event.target.value)}
                required
              />
              <Button disabled={startSuperOver.isPending}>Start Super Over</Button>
              <MutationStatus error={startSuperOver.error} />
            </form>
          </PagePanel>
        ) : null}
      </div>
    );
  }

  // Render Toss Required state
  if (match.status === 'draft' || match.status === 'scheduled' || match.status === 'teams_created') {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <PagePanel title="Toss Required">
          <div className="grid gap-4 text-center py-4">
            <p className="text-slate-700">You must conduct the toss before scoring can begin.</p>
            <p className="text-sm text-slate-500">
              Go to the Toss page to record the toss winner and their batting decision.
            </p>
            <div className="mt-2">
              <Button onClick={() => navigate(`/admin/matches/${matchId}/toss`)}>Go to Toss Page</Button>
            </div>
          </div>
        </PagePanel>
      </div>
    );
  }

  // If no active innings, something went wrong
  if (!activeInnings) {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 max-w-lg mx-auto text-center">
        <p className="font-semibold text-lg">Innings Not Found</p>
        <p className="text-sm mt-1">Active innings could not be determined. Please contact admin.</p>
      </div>
    );
  }

  const battingTeamName = activeInnings.batting_team === 'team_a' ? match.team_a_name : match.team_b_name;
  const bowlingTeamName = activeInnings.bowling_team === 'team_a' ? match.team_a_name : match.team_b_name;

  // 1. INNINGS NOT STARTED STATE
  if (activeInnings.status === 'not_started') {
    return (
      <main className="max-w-md mx-auto space-y-4">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <PagePanel title={`Innings ${activeInnings.innings_number} - Setup`}>
          <div className="mb-4 space-y-2">
            <h3 className="font-semibold text-slate-800 text-lg">
              {battingTeamName} is batting{activeInnings.innings_number === 2 ? ' second' : ' first'}
            </h3>
            <p className="text-sm text-slate-500">
              Configure the opening batsmen and opening bowler to start scoring.
            </p>
            {activeInnings.target_runs ? (
              <div className="mt-3 rounded-lg bg-teal-50 border border-teal-200 p-3 text-center">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Target</span>
                <p className="text-xl font-bold text-teal-700">{activeInnings.target_runs} runs</p>
              </div>
            ) : null}
          </div>

          <form className="grid gap-4" onSubmit={handleStartInnings}>
            <SelectField
              label="Opening Striker (Batting)"
              value={openingStrikerId}
              onChange={(e) => setOpeningStrikerId(e.target.value)}
              required
            >
              <option value="">Select striker</option>
              {squads.batting.map((mp) => (
                <option key={mp.player_id} value={mp.player_id} disabled={mp.player_id === openingNonStrikerId}>
                  {playerMap.get(mp.player_id) ?? 'Player'}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Opening Non-Striker (Batting)"
              value={openingNonStrikerId}
              onChange={(e) => setOpeningNonStrikerId(e.target.value)}
              required
            >
              <option value="">Select non-striker</option>
              {squads.batting.map((mp) => (
                <option key={mp.player_id} value={mp.player_id} disabled={mp.player_id === openingStrikerId}>
                  {playerMap.get(mp.player_id) ?? 'Player'}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Opening Bowler (Bowling)"
              value={openingBowlerId}
              onChange={(e) => setOpeningBowlerId(e.target.value)}
              required
            >
              <option value="">Select bowler</option>
              {squads.bowling.map((mp) => (
                <option key={mp.player_id} value={mp.player_id}>
                  {playerMap.get(mp.player_id) ?? 'Player'}
                </option>
              ))}
            </SelectField>

            <Button disabled={updateInnings.isPending}>Start Innings</Button>
            <MutationStatus error={updateInnings.error} />
          </form>
        </PagePanel>
      </main>
    );
  }

  // 2. INNINGS IN PROGRESS STATE (scoring console)
  return (
    <main className="max-w-md mx-auto space-y-4 pb-10">
      {/* 2.1 Innings Score Header Card */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-700/50">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {activeInnings.innings_number === 1 ? '1st Innings' : '2nd Innings'} - {battingTeamName}
            </h2>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-extrabold tracking-tight text-white">
                {inningsState?.totalRuns ?? 0}<span className="text-slate-400 font-bold">/{inningsState?.wickets ?? 0}</span>
              </span>
              <span className="text-slate-400 text-sm font-medium">
                <span className="text-slate-500">(</span>{inningsState?.oversDisplay ?? '0.0'}<span className="text-slate-500"> / {match.overs_per_innings} ov)</span>
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-teal-400 font-semibold block uppercase tracking-wide">
              {match.match_name}
            </span>
            <span className="text-xs text-slate-500">
              vs {bowlingTeamName}
            </span>
          </div>
        </div>

        {/* Target and Chase statistics */}
        {activeInnings.target_runs ? (
          <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-2.5 text-center">
              <p className="text-slate-500 uppercase font-bold tracking-wider">Target</p>
              <p className="text-lg font-bold text-teal-300 mt-0.5">{activeInnings.target_runs}</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-2.5 text-center">
              <p className="text-slate-500 uppercase font-bold tracking-wider">Need</p>
              <p className="text-lg font-bold text-amber-300 mt-0.5">{inningsState?.runsRequired ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-2.5 text-center">
              <p className="text-slate-500 uppercase font-bold tracking-wider">Left</p>
              <p className="text-lg font-bold text-sky-300 mt-0.5">{inningsState?.ballsRemaining ?? '-'}</p>
            </div>
          </div>
        ) : null}

        {/* Run Rates summary */}
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" /> CRR: <strong className="text-slate-200">{inningsState?.currentRunRate?.toFixed(1) ?? '0.0'}</strong></span>
          {activeInnings.target_runs && (
            <span className="inline-flex items-center gap-1"><Gauge className="w-3 h-3" /> RRR: <strong className="text-slate-200">{inningsState?.requiredRunRate?.toFixed(1) ?? '0.0'}</strong></span>
          )}
        </div>
      </section>

      {/* 2.2 Innings Complete Notification Banner */}
      {inningsState?.isCompleted ? (
        <section className="rounded-xl bg-amber-50 border border-amber-200 p-5 text-center space-y-4">
          <div>
            <div className="flex justify-center mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <h3 className="font-bold text-amber-700 text-lg">Innings Complete!</h3>
            <p className="text-sm text-slate-500 mt-1">
              {battingTeamName} scored <strong className="text-slate-800">{inningsState.totalRuns}/{inningsState.wickets}</strong> in {inningsState.oversDisplay} overs
            </p>
          </div>
          {activeInnings.innings_number === 1 ? (
  <Button
    className="w-full"
    onClick={handleCompleteInnings1}
    disabled={updateInnings.isPending}
  >
    Proceed to 2nd Innings
  </Button>
) : (
  <>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300 text-left">
        Player of the Match
      </label>

      <select
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        value={playerOfMatchId}
        onChange={(e) => setPlayerOfMatchId(e.target.value)}
      >
        <option value="">Select Player</option>

        {matchPlayers.map((player) => (
          <option key={player.player_id} value={player.player_id}>
            {playerMap.get(player.player_id) ?? player.player_id}
          </option>
        ))}
      </select>
    </div>

    <Button
      className="w-full"
      onClick={handleCompleteInnings2}
      disabled={updateInnings.isPending || completeMatch.isPending}
    >
      Complete Match
    </Button>
  </>
)}
          <MutationStatus error={updateInnings.error || completeMatch.error} />
        </section>
      ) : null}

      {/* 2.3 Batsmen crease stats section */}
      {!inningsState?.isCompleted && inningsState && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">Batting</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Striker batsman */}
            <div className="rounded-lg bg-gradient-to-br from-teal-50 to-white border border-teal-200 p-3.5">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-teal-600 font-bold text-lg leading-none mt-0.5">*</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {inningsState.strikerId ? playerMap.get(inningsState.strikerId) : 'No Striker'}
                  </p>
                  {inningsState.strikerId && inningsState.battingStats[inningsState.strikerId]?.balls === 0 && (
                    <select
                      className="text-xs bg-white border border-slate-300 rounded px-1 mt-1.5 w-full text-slate-700 outline-none focus:border-teal-500"
                      value={inningsState.strikerId}
                      onChange={(e) => setIncomingBatsmanId(e.target.value)}
                    >
                      <option value={inningsState.strikerId}>Swap batsman</option>
                      {remainingBatsmen.map((id) => (
                        <option key={id} value={id}>
                          {playerMap.get(id)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {inningsState.strikerId && inningsState.battingStats[inningsState.strikerId] ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-teal-600/60 uppercase font-bold tracking-wider text-[10px]">Runs</p>
                    <p className="text-xl font-bold text-teal-700">{inningsState.battingStats[inningsState.strikerId].runs}</p>
                  </div>
                  <div>
                    <p className="text-teal-600/60 uppercase font-bold tracking-wider text-[10px]">Balls</p>
                    <p className="text-xl font-bold text-teal-700">{inningsState.battingStats[inningsState.strikerId].balls}</p>
                  </div>
                  <div>
                    <p className="text-teal-600/60 uppercase font-bold tracking-wider text-[10px]">4s</p>
                    <p className="font-bold text-teal-700">{inningsState.battingStats[inningsState.strikerId].fours}</p>
                  </div>
                  <div>
                    <p className="text-teal-600/60 uppercase font-bold tracking-wider text-[10px]">6s</p>
                    <p className="font-bold text-teal-700">{inningsState.battingStats[inningsState.strikerId].sixes}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-teal-600/60 uppercase font-bold tracking-wider text-[10px]">SR</p>
                    <p className="font-bold text-teal-700">{inningsState.battingStats[inningsState.strikerId].strikeRate.toFixed(1)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">0 (0b) | SR: 0.0</p>
              )}
            </div>

            {/* Non-Striker batsman */}
            <div className="rounded-lg bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-3.5">
              <div className="flex items-start gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 truncate">
                    {inningsState.nonStrikerId ? playerMap.get(inningsState.nonStrikerId) : 'No Non-Striker'}
                  </p>
                  {inningsState.nonStrikerId && inningsState.battingStats[inningsState.nonStrikerId]?.balls === 0 && (
                    <select
                      className="text-xs bg-white border border-slate-300 rounded px-1 mt-1.5 w-full text-slate-700 outline-none focus:border-teal-500"
                      value={inningsState.nonStrikerId}
                      onChange={(e) => setIncomingBatsmanId(e.target.value)}
                    >
                      <option value={inningsState.nonStrikerId}>Swap batsman</option>
                      {remainingBatsmen.map((id) => (
                        <option key={id} value={id}>
                          {playerMap.get(id)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {inningsState.nonStrikerId && inningsState.battingStats[inningsState.nonStrikerId] ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Runs</p>
                    <p className="text-xl font-bold text-slate-700">{inningsState.battingStats[inningsState.nonStrikerId].runs}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Balls</p>
                    <p className="text-xl font-bold text-slate-700">{inningsState.battingStats[inningsState.nonStrikerId].balls}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">4s</p>
                    <p className="font-bold text-slate-700">{inningsState.battingStats[inningsState.nonStrikerId].fours}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">6s</p>
                    <p className="font-bold text-slate-700">{inningsState.battingStats[inningsState.nonStrikerId].sixes}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">SR</p>
                    <p className="font-bold text-slate-700">{inningsState.battingStats[inningsState.nonStrikerId].strikeRate.toFixed(1)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">0 (0b) | SR: 0.0</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2.4 Bowler crease stats section */}
      {!inningsState?.isCompleted && inningsState && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">Bowling</h3>
          {currentBowlerId && inningsState.bowlingStats[currentBowlerId] ? (
            <div className="rounded-lg bg-gradient-to-br from-red-50 to-white border border-red-200 p-3.5">
              <p className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                {playerMap.get(currentBowlerId)}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-red-600/60 uppercase font-bold tracking-wider text-[10px]">Overs</p>
                  <p className="text-lg font-bold text-red-700">{inningsState.bowlingStats[currentBowlerId].oversDisplay}</p>
                </div>
                <div>
                  <p className="text-red-600/60 uppercase font-bold tracking-wider text-[10px]">M</p>
                  <p className="text-lg font-bold text-red-700">{inningsState.bowlingStats[currentBowlerId].maidens}</p>
                </div>
                <div>
                  <p className="text-red-600/60 uppercase font-bold tracking-wider text-[10px]">Runs</p>
                  <p className="text-lg font-bold text-red-700">{inningsState.bowlingStats[currentBowlerId].runsConceded}</p>
                </div>
                <div>
                  <p className="text-red-600/60 uppercase font-bold tracking-wider text-[10px]">W</p>
                  <p className="text-lg font-bold text-red-700">{inningsState.bowlingStats[currentBowlerId].wickets}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-red-600/60 uppercase font-bold tracking-wider text-[10px]">Eco</p>
                  <p className="text-lg font-bold text-red-700">{inningsState.bowlingStats[currentBowlerId].economy.toFixed(1)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
              <p className="text-sm text-slate-500 font-semibold">Select Bowler</p>
            </div>
          )}
        </section>
      )}

      {/* 2.4b Match Statistics Panel */}
      {!inningsState?.isCompleted && inningsState && activeInnings?.target_runs && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">Chase</h3>
          <div className="grid grid-cols-2 gap-2.5 text-sm">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-center">
              <p className="text-[10px] text-amber-600/60 uppercase font-bold tracking-wider">Target</p>
              <p className="text-lg font-bold text-amber-700">{activeInnings.target_runs}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
              <p className="text-[10px] text-emerald-600/60 uppercase font-bold tracking-wider">Required</p>
              <p className="text-lg font-bold text-emerald-700">{inningsState.runsRequired ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-sky-50 border border-sky-200 p-2.5 text-center">
              <p className="text-[10px] text-sky-600/60 uppercase font-bold tracking-wider">Balls Left</p>
              <p className="text-lg font-bold text-sky-700">{inningsState.ballsRemaining ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-2.5 text-center">
              <p className="text-[10px] text-teal-600/60 uppercase font-bold tracking-wider">RRR</p>
              <p className="text-lg font-bold text-teal-700">{inningsState.requiredRunRate?.toFixed(1) ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-2.5 text-center col-span-2">
              <p className="text-[10px] text-purple-600/60 uppercase font-bold tracking-wider">CRR</p>
              <p className="text-lg font-bold text-purple-700">{inningsState.currentRunRate.toFixed(1)}</p>
            </div>
          </div>
          <WinPredictor
            targetRuns={activeInnings.target_runs}
            currentRuns={inningsState.totalRuns}
            wicketsLost={inningsState.wickets}
            totalWickets={match.players_per_team}
            oversUsed={inningsState.legalBalls}
            totalOvers={match.overs_per_innings}
            battingTeamName={battingTeamName}
            bowlingTeamName={bowlingTeamName}
          />
        </section>
      )}
      {/* 2.5 Console Control Action Area */}
      {!inningsState?.isCompleted && inningsState && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* A. WICKET FORM OVERLAY */}
          {showWicketForm ? (
            <form onSubmit={handleLogWicket} className="grid gap-3">
              <h3 className="font-bold text-red-600 text-sm border-b border-slate-200 pb-2 flex items-center gap-2">
                <Skull className="w-4 h-4" /> Log Wicket
              </h3>

              <SelectField
                label="Dismissal Type"
                value={wicketType}
                onChange={(e) => setWicketType(e.target.value as WicketType)}
                required
              >
                <option value="bowled">Bowled</option>
                <option value="caught">Caught</option>
                <option value="lbw">LBW</option>
                <option value="stumped">Stumped</option>
                <option value="run_out">Run Out</option>
                <option value="hit_wicket">Hit Wicket</option>
              </SelectField>

              <SelectField
                label="Dismissed Batsman"
                value={dismissedPlayerId}
                onChange={(e) => setDismissedPlayerId(e.target.value)}
                required
              >
                <option value="">Select dismissed player</option>
                {inningsState.strikerId ? (
                  <option value={inningsState.strikerId}>
                    {playerMap.get(inningsState.strikerId)} (Striker)
                  </option>
                ) : null}
                {inningsState.nonStrikerId ? (
                  <option value={inningsState.nonStrikerId}>
                    {playerMap.get(inningsState.nonStrikerId)} (Non-Striker)
                  </option>
                ) : null}
              </SelectField>

              <SelectField
                label="Fielder (Catches, Stumpings, Run Outs)"
                value={fielderId}
                onChange={(e) => setFielderId(e.target.value)}
              >
                <option value="">Select fielder (optional)</option>
                {squads.bowling.map((mp) => (
                  <option key={mp.player_id} value={mp.player_id}>
                    {playerMap.get(mp.player_id)}
                  </option>
                ))}
              </SelectField>

              {/* Extra runs run for Run Outs */}
              {wicketType === 'run_out' && (
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label="Runs Off Bat"
                    value={wicketRunsBatter}
                    onChange={(e) => setWicketRunsBatter(e.target.value)}
                  >
                    <option value="0">0 runs</option>
                    <option value="1">1 run</option>
                    <option value="2">2 runs</option>
                    <option value="3">3 runs</option>
                  </SelectField>
                  <SelectField
                    label="Extra Type"
                    value={wicketExtraType}
                    onChange={(e) => setWicketExtraType(e.target.value as ExtraType | '')}
                  >
                    <option value="">Legal ball</option>
                    <option value="wide">Wide</option>
                    <option value="no_ball">No Ball</option>
                    <option value="bye">Bye</option>
                    <option value="leg_bye">Leg Bye</option>
                  </SelectField>
                </div>
              )}

              {/* Selector for the batsman who enters the crease next */}
              {inningsState.wickets + 1 < maxWickets && remainingBatsmen.length > 0 ? (
                <SelectField
                  label="Incoming Batsman"
                  value={incomingBatsmanId || ''}
                  onChange={(e) => setIncomingBatsmanId(e.target.value)}
                  required
                >
                  <option value="">Select incoming batsman</option>
                  {remainingBatsmen.map((id) => (
                    <option key={id} value={id}>
                      {playerMap.get(id)}
                    </option>
                  ))}
                </SelectField>
              ) : null}

              <div className="flex gap-2 mt-2">
                <Button type="submit" variant="danger" className="flex-1" disabled={createBallEvent.isPending}>
                  <Skull className="w-4 h-4 mr-1" /> Save Wicket
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowWicketForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : showExtraForm ? (
            /* B. EXTRA FORM OVERLAY */
            <form onSubmit={handleLogExtra} className="grid gap-3">
              <h3 className="font-bold text-teal-600 text-sm border-b border-slate-200 pb-2">
                Log Extra - {selectedExtraType === 'wide' ? 'Wide' : selectedExtraType === 'no_ball' ? 'No Ball' : selectedExtraType === 'bye' ? 'Bye' : 'Leg Bye'}
              </h3>

              {/* If No Ball, batsman can score runs off the bat */}
              {selectedExtraType === 'no_ball' && (
                <SelectField
                  label="Runs Off Bat"
                  value={extraRunsBatter}
                  onChange={(e) => setExtraRunsBatter(e.target.value)}
                >
                  <option value="0">0 runs</option>
                  <option value="1">1 run</option>
                  <option value="2">2 runs</option>
                  <option value="3">3 runs</option>
                  <option value="4">4 runs</option>
                  <option value="6">6 runs</option>
                </SelectField>
              )}

              {/* Extra runs run or penalty */}
              <SelectField
                label={
                  selectedExtraType === 'wide' || selectedExtraType === 'no_ball'
                    ? 'Total Extras (1 standard + run-byes)'
                    : 'Runs Completed (Byes/Leg Byes)'
                }
                value={extraRunsExtra}
                onChange={(e) => setExtraRunsExtra(e.target.value)}
              >
                <option value="1">1 run</option>
                <option value="2">2 runs</option>
                <option value="3">3 runs</option>
                <option value="4">4 runs</option>
                {selectedExtraType === 'wide' && <option value="5">5 runs (4 boundary + 1 wide)</option>}
              </SelectField>

              <div className="flex gap-2 mt-2">
                <Button type="submit" className="flex-1" disabled={createBallEvent.isPending}>
                  <Zap className="w-4 h-4 mr-1" /> Save Extra
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowExtraForm(false); setSelectedExtraType(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : needsBowlerSelection ? (
            /* C. BOWLER CHANGE CARD (blocks other scoring buttons) */
            <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <div className="flex justify-center">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <h4 className="font-bold text-amber-700 text-sm">
                {isOverComplete ? 'Over Complete!' : 'Bowler Required'}
              </h4>
              <p className="text-xs text-slate-500">
                {isOverComplete ? 'Select a different bowler for the next over.' : 'Select the bowler to start scoring.'}
              </p>
              <SelectField
                label="Select Bowler"
                value={currentBowlerId || ''}
                onChange={(e) => setCurrentBowlerId(e.target.value)}
                required
              >
                <option value="">Select bowler</option>
                {squads.bowling.map((mp) => (
                  <option key={mp.player_id} value={mp.player_id} disabled={mp.player_id === lastEvent?.bowlerId}>
                    {playerMap.get(mp.player_id) ?? 'Player'} {mp.player_id === lastEvent?.bowlerId ? '(Bowled last over)' : ''}
                  </option>
                ))}
              </SelectField>
              <Button type="button" onClick={() => {}} disabled={!currentBowlerId || currentBowlerId === lastEvent?.bowlerId}>
                Confirm Bowler
              </Button>
            </div>
          ) : (
            /* D. REGULAR scoring console buttons grid */
            <div className="space-y-4">
              {/* Normal Runs Buttons */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Runs</h4>
                <div className="grid grid-cols-3 gap-2">
                  {([0, 1, 2, 3, 4, 6] as const).map((runs) => {
                    const colorMap: Record<number, string> = {
                      0: 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200',
                      1: 'bg-teal-100 hover:bg-teal-200 text-teal-700 border-teal-200',
                      2: 'bg-teal-100 hover:bg-teal-200 text-teal-700 border-teal-200',
                      3: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200',
                      4: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-200',
                      6: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200'
                    };
                    return (
                      <button
                        key={runs}
                        type="button"
                        onClick={() => handleLogBall(runs)}
                        className={`min-h-12 rounded-lg font-extrabold text-lg border flex items-center justify-center transition-all duration-150 active:scale-95 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${colorMap[runs]}`}
                        disabled={createBallEvent.isPending}
                      >
                        {runs}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extras buttons panel */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Extras</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['wide', 'no_ball', 'bye', 'leg_bye'] as ExtraType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelectedExtraType(type);
                        setExtraRunsExtra(type === 'wide' || type === 'no_ball' ? '1' : '1');
                        setExtraRunsBatter('0');
                        setShowExtraForm(true);
                      }}
                      className="min-h-11 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-bold border border-purple-200 transition-all duration-150 active:scale-95 capitalize flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                      disabled={createBallEvent.isPending}
                    >
                      {type === 'no_ball' ? 'No Ball' : type === 'leg_bye' ? 'Leg Bye' : type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons panel */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWicketForm(true)}
                  className="min-h-12 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold shadow-sm transition-all duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  disabled={createBallEvent.isPending}
                >
                  <Skull className="w-4 h-4" /> Wicket
                </button>
                <button
                  type="button"
                  onClick={handleUndo}
                  className="min-h-12 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 font-semibold shadow-sm transition-all duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  disabled={undoLastBall.isPending || ballEvents.length === 0}
                >
                  <Undo2 className="w-4 h-4" /> Undo
                </button>
              </div>
            </div>
          )}

          {/* Mutations error display */}
          <MutationStatus error={createBallEvent.error || undoLastBall.error} />
        </section>
      )}
    </main>
  );
}
