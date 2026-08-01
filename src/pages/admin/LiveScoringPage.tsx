import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Undo2, RotateCcw, Zap, Plus, X, Volume2, VolumeX, Share2 } from 'lucide-react';
import { Button } from '../../components/forms/Button';
import { SelectField, TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { Badge } from '../../components/ui/Badge';
import {
  useMatch,
  useInnings,
  useUpdateInnings,
  useCompleteMatch,
  useMatchPlayers,
  useStartSuperOver,
  useSetMatchInProgress
} from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents, useCreateBallEvent, useUndoLastBall } from '../../hooks/useBallEvents';
import type { CreateBallEventInput } from '../../repositories/ballEventsRepository';
import { emitScoreEvent } from '../../components/common/ScoreAnimation';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import type { BallEvent, TeamSide, ExtraType, WicketType } from '../../types/models';
import { supabase } from '../../services/supabaseClient';
import { updateStatsForCompletedMatch } from '../../services/statisticsService';
import { useState, type FormEvent, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { WinPredictor } from '../../components/common/WinPredictor';
import { POTMRecommendation } from '../../components/common/POTMRecommendation';
import { CountUp } from '../../components/common/CountUp';
import { BallTimeline } from '../../components/common/BallTimeline';
import { useToastStore } from '../../stores/toastStore';
import { useSoundStore } from '../../stores/soundStore';
import { playSound } from '../../utils/sound';
import { downloadScorecardPNG, type ScorecardTeam } from '../../utils/scorecardImage';

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

  add(openingStrikerId);
  add(openingNonStrikerId);

  const sorted = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  for (const event of sorted) {
    add(event.strikerId);
    add(event.nonStrikerId);
  }

  if (incomingBatsmanId) {
    add(incomingBatsmanId);
  }

  for (const id of squadPlayerIds) {
    add(id);
  }

  return order;
}

export function LiveScoringPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();

  const { data: match, isLoading: matchLoading, error: matchError } = useMatch(matchId);
  const { data: inningsList = [], isLoading: inningsLoading } = useInnings(matchId);
  const { data: matchPlayers = [], isLoading: playersLoading } = useMatchPlayers(matchId);
  const { data: players = [] } = usePlayers();

  const updateInnings = useUpdateInnings();
  const completeMatch = useCompleteMatch();
  const startSuperOver = useStartSuperOver();
  const setMatchInProgress = useSetMatchInProgress();
  const createBallEvent = useCreateBallEvent();
  const undoLastBall = useUndoLastBall();
  const queryClient = useQueryClient();

  const [openingStrikerId, setOpeningStrikerId] = useState('');
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState('');
  const [openingBowlerId, setOpeningBowlerId] = useState('');

  const [currentBowlerId, setCurrentBowlerId] = useState<string | null>(null);
  const [incomingBatsmanId, setIncomingBatsmanId] = useState<string | null>(null);
  const [startInningsRequested, setStartInningsRequested] = useState(false);

  const [showWicketForm, setShowWicketForm] = useState(false);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraType | null>(null);

  const [wicketType, setWicketType] = useState<WicketType>('bowled');
  const [dismissedPlayerId, setDismissedPlayerId] = useState('');
  const [fielderId, setFielderId] = useState('');
  const [wicketRunsBatter, setWicketRunsBatter] = useState('0');
  const [wicketRunsExtra, setWicketRunsExtra] = useState('0');
  const [wicketExtraType, setWicketExtraType] = useState<ExtraType | ''>('');
  const [wicketIsLegal, setWicketIsLegal] = useState(true);

  const [extraRunsBatter, setExtraRunsBatter] = useState('0');
  const [extraRunsExtra, setExtraRunsExtra] = useState('1');

  const [hasBowlerBeenChangedThisOver, setHasBowlerBeenChangedThisOver] = useState(false);
  const [hasBatsmanBeenChangedThisOver, setHasBatsmanBeenChangedThisOver] = useState(false);

  const [superOverName, setSuperOverName] = useState('Super Over');
  const [playerOfMatchId, setPlayerOfMatchId] = useState('');

  const [scoreFlash, setScoreFlash] = useState<'boundary' | 'wicket' | null>(null);
  const lastTotalRunsRef = useRef(0);

  const showToast = useToastStore((s) => s.show);
  const soundMuted = useSoundStore((s) => s.muted);
  const toggleSoundMuted = useSoundStore((s) => s.toggleMuted);

  const prevEventsLenRef = useRef(0);
  const hasPopulatedRef = useRef(false);
  const partnershipMaxRef = useRef(0);
  const fiftyFiredRef = useRef(false);

  const wicketJustOpenedRef = useRef(false);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map((p) => [p.id, p.photo_url])), [players]);

  const innings1 = useMemo(
    () => inningsList.find((i) => i.innings_number === 1) ?? null,
    [inningsList]
  );
  const innings2 = useMemo(
    () => inningsList.find((i) => i.innings_number === 2) ?? null,
    [inningsList]
  );

  const { data: innings1Events = [] } = useBallEvents(innings1?.id ?? null);
  const { data: innings2Events = [] } = useBallEvents(innings2?.id ?? null);

  const allMatchEvents = useMemo(
    () => [...innings1Events, ...innings2Events],
    [innings1Events, innings2Events]
  );

  const potmParams = useMemo(() => {
    if (!innings2) return null;
    const inn2Events = allMatchEvents.filter((e) => e.inningsId === innings2.id);
    if (allMatchEvents.length === 0 || inn2Events.length === 0) return null;
    let totalRuns = 0;
    let wickets = 0;
    let legalBalls = 0;
    for (const event of inn2Events) {
      totalRuns += event.runsBatter + event.runsExtra;
      if (event.isWicket) wickets += 1;
      if (event.isLegalDelivery && event.extraType !== 'wide' && event.extraType !== 'no_ball') {
        legalBalls += 1;
      }
    }
    const chasePlayerIds = new Set(
      matchPlayers.filter((mp) => mp.team === innings2.batting_team).map((mp) => mp.player_id)
    );
    return {
      events: allMatchEvents,
      chasePlayerIds,
      chaseState: {
        totalRuns,
        wickets,
        targetRuns: innings2.target_runs ?? 0,
        legalBalls,
        oversPerInnings: match?.overs_per_innings ?? 6,
      },
    };
  }, [allMatchEvents, innings2, matchPlayers, match]);

  const activeInnings = useMemo(() => {
    if (inningsList.length === 0) return null;
    const inn1 = inningsList.find((i) => i.innings_number === 1);
    const inn2 = inningsList.find((i) => i.innings_number === 2);

    if (inn1 && inn1.status !== 'completed') return inn1;
    if (inn2 && inn2.status !== 'completed') return inn2;
    return null;
  }, [inningsList]);

  const { data: ballEvents = [], isLoading: eventsLoading } = useBallEvents(activeInnings?.id ?? null);

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

  const firstEvent = useMemo(() => {
    if (ballEvents.length === 0) return null;
    return [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber)[0];
  }, [ballEvents]);

  const resolvedOpeningStrikerId = firstEvent?.strikerId || openingStrikerId;
  const resolvedOpeningNonStrikerId = firstEvent?.nonStrikerId || openingNonStrikerId;

  const inningsState = useMemo(() => {
    if (!activeInnings || !match || !resolvedOpeningStrikerId || !resolvedOpeningNonStrikerId) return null;

    const battingOrder = determineBattingOrder(
      battingSquadIds,
      ballEvents,
      resolvedOpeningStrikerId,
      resolvedOpeningNonStrikerId,
      null
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
  }, [activeInnings, match, resolvedOpeningStrikerId, resolvedOpeningNonStrikerId, battingSquadIds, ballEvents]);

  const remainingBatsmen = useMemo(() => {
    if (!inningsState) return battingSquadIds;
    const battedIds = Object.keys(inningsState.battingStats);
    return battingSquadIds.filter((id) => !battedIds.includes(id));
  }, [inningsState, battingSquadIds]);

  const dismissedPlayerIds = useMemo(() => {
    const dismissed = new Set<string>();
    for (const event of ballEvents) {
      if (event.isWicket && event.dismissedPlayerId) {
        dismissed.add(event.dismissedPlayerId);
      }
    }
    return dismissed;
  }, [ballEvents]);

  const eligibleIncomingBatsmen = useMemo(() => {
    if (!inningsState) return battingSquadIds;
    const exclude = new Set<string>();
    if (inningsState.strikerId) exclude.add(inningsState.strikerId);
    if (inningsState.nonStrikerId) exclude.add(inningsState.nonStrikerId);
    for (const id of dismissedPlayerIds) exclude.add(id);
    return battingSquadIds.filter((id) => !exclude.has(id));
  }, [inningsState?.strikerId, inningsState?.nonStrikerId, dismissedPlayerIds, battingSquadIds]);

  const lastEvent = useMemo(() => {
    if (ballEvents.length === 0) return null;
    return [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber)[ballEvents.length - 1];
  }, [ballEvents]);

  useEffect(() => {
    if (inningsState?.currentBowlerId) {
      setCurrentBowlerId(inningsState.currentBowlerId);
    } else if (lastEvent?.bowlerId) {
      setCurrentBowlerId(lastEvent.bowlerId);
    } else if (openingBowlerId) {
      setCurrentBowlerId(openingBowlerId);
    }
  }, [inningsState?.currentBowlerId, lastEvent?.bowlerId, openingBowlerId]);

  useEffect(() => {
    setStartInningsRequested(false);
  }, [activeInnings?.id]);

  useEffect(() => {
    if (!inningsState || inningsState.totalRuns === lastTotalRunsRef.current) return;
    lastTotalRunsRef.current = inningsState.totalRuns;
    const lastBall = ballEvents[ballEvents.length - 1];
    if (lastBall?.isWicket) {
      setScoreFlash('wicket');
    } else if ((lastBall?.runsBatter ?? 0) >= 4) {
      setScoreFlash('boundary');
    } else {
      setScoreFlash(null);
    }
    const timer = setTimeout(() => setScoreFlash(null), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inningsState?.totalRuns]);

  useEffect(() => {
    if (incomingBatsmanId && inningsState) {
      const isAtCrease = inningsState.strikerId === incomingBatsmanId || inningsState.nonStrikerId === incomingBatsmanId;
      const hasFacedBall = ballEvents.some((be) => be.strikerId === incomingBatsmanId || be.nonStrikerId === incomingBatsmanId);
      if (isAtCrease && hasFacedBall) {
        setIncomingBatsmanId(null);
      }
    }
  }, [incomingBatsmanId, inningsState, ballEvents]);

  const lastSixBalls = useMemo(() => {
    const sorted = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    return sorted.slice(-6).map((e) => ({
      key: e.id,
      runs: e.runsBatter,
      extra: e.extraType,
      isWicket: e.isWicket,
      isLegal: e.isLegalDelivery,
      label: e.isWicket ? 'W' : e.runsBatter === 6 ? '6' : e.runsBatter === 4 ? '4' : e.runsBatter === 0 ? (e.runsExtra > 0 ? 'X' : '•') : String(e.runsBatter)
    }));
  }, [ballEvents]);

  const partnership = useMemo(() => {
    if (!inningsState?.strikerId || !inningsState?.nonStrikerId) return null;
    const s = inningsState.battingStats[inningsState.strikerId];
    const n = inningsState.battingStats[inningsState.nonStrikerId];
    if (!s || !n) return null;
    return { runs: s.runs + n.runs, balls: s.balls + n.balls, fours: s.fours + n.fours, sixes: s.sixes + n.sixes };
  }, [inningsState]);

  const overHistory = useMemo(() => {
    const sorted = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    const overs: { num: number; runs: number; wickets: number }[] = [];
    let currentOver: number | null = null;
    for (const e of sorted) {
      if (e.overNumber !== currentOver) {
        currentOver = e.overNumber;
        overs.push({ num: e.overNumber, runs: 0, wickets: 0 });
      }
      const last = overs[overs.length - 1];
      last.runs += e.runsBatter + e.runsExtra;
      if (e.isWicket) last.wickets += 1;
    }
    return overs;
  }, [ballEvents]);

  const previousOverStats = useMemo(() => {
    if (overHistory.length < 2 || !currentBowlerId) return null;
    const prevOver = overHistory[overHistory.length - 2];
    return prevOver;
  }, [overHistory, currentBowlerId]);

  const isOverComplete = useMemo(() => {
    if (!inningsState) return false;
    return inningsState.legalBalls > 0 && inningsState.legalBalls % 6 === 0;
  }, [inningsState]);

  const needsBowlerSelection = useMemo(() => {
    if (!inningsState) return false;
    if (ballEvents.length === 0) return !currentBowlerId;
    if (isOverComplete) {
      return !currentBowlerId || currentBowlerId === lastEvent?.bowlerId;
    }
    return !currentBowlerId;
  }, [inningsState, ballEvents, isOverComplete, currentBowlerId, lastEvent]);

  const legalDeliveriesInCurrentOver = useMemo(() => {
    if (!inningsState || ballEvents.length === 0) return 0;
    const currentOver = Math.floor(inningsState.legalBalls / 6);
    return ballEvents.filter((e) => e.overNumber === currentOver && e.isLegalDelivery).length;
  }, [inningsState, ballEvents]);

  const canChangeBowler = useMemo(() => {
    if (!inningsState) return false;
    if (ballEvents.length === 0) return true;
    if (legalDeliveriesInCurrentOver === 0 && !hasBowlerBeenChangedThisOver) return true;
    return false;
  }, [inningsState, ballEvents, legalDeliveriesInCurrentOver, hasBowlerBeenChangedThisOver]);

  const canChangeBatsmen = useMemo(() => {
    if (!inningsState) return false;
    if (ballEvents.length === 0) return true;
    if (legalDeliveriesInCurrentOver === 0 && !hasBatsmanBeenChangedThisOver) return true;
    return false;
  }, [inningsState, ballEvents, legalDeliveriesInCurrentOver, hasBatsmanBeenChangedThisOver]);

  useEffect(() => {
    if (isOverComplete) {
      setHasBowlerBeenChangedThisOver(false);
      setHasBatsmanBeenChangedThisOver(false);
    }
  }, [isOverComplete]);

  const last12Balls = useMemo(() => {
    const sorted = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    return sorted.slice(-12);
  }, [ballEvents]);

  const momentumSegments = useMemo(() => {
    return last12Balls.map((e) => {
      if (e.isWicket) return 'wicket';
      if (e.runsBatter >= 6) return 'six';
      if (e.runsBatter >= 4) return 'four';
      if (e.runsBatter >= 1) return 'run';
      if (e.runsExtra > 0) return 'extra';
      return 'dot';
    });
  }, [last12Balls]);

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

    if (match?.status !== 'in_progress') {
      await setMatchInProgress.mutateAsync(matchId);
    }

    setCurrentBowlerId(openingBowlerId);
    setHasBowlerBeenChangedThisOver(false);
    setHasBatsmanBeenChangedThisOver(false);
    setIncomingBatsmanId(null);
    setStartInningsRequested(true);
    showToast('Innings started.', 'info');
    playSound('click');
  }

  async function handleLogBall(runsBatter: 0 | 1 | 2 | 3 | 4 | 6) {
    if (!activeInnings || !inningsState || !currentBowlerId) return;

    setShowWicketForm(false);
    setWicketType('bowled');
    setDismissedPlayerId('');
    setFielderId('');
    setWicketRunsBatter('0');
    setWicketRunsExtra('0');
    setWicketExtraType('');
    setWicketIsLegal(true);

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

    setIncomingBatsmanId(null);
    emitScoreEvent('runs', `+${runsBatter}`);

    if (runsBatter === 4) {
      playSound('boundary');
      showToast('Boundary! Four runs.', 'boundary');
    } else if (runsBatter === 6) {
      playSound('six');
      showToast('SIX! Maximum.', 'six');
    } else {
      playSound('click');
    }
  }

  async function handleLogExtra(event: FormEvent) {
    event.preventDefault();
    if (!activeInnings || !inningsState || !currentBowlerId || !selectedExtraType) return;

    setWicketType('bowled');
    setDismissedPlayerId('');
    setFielderId('');
    setWicketRunsBatter('0');
    setWicketRunsExtra('0');
    setWicketExtraType('');
    setWicketIsLegal(true);

    const overNumber = Math.floor(inningsState.legalBalls / 6);
    const ballInOver = (inningsState.legalBalls % 6) + 1;
    const runsB = Number(extraRunsBatter);
    const runsEx = Number(extraRunsExtra);
    const isLegal = selectedExtraType === 'bye' || selectedExtraType === 'leg_bye';

    const eventInput: CreateBallEventInput = {
      match_id: matchId,
      innings_id: activeInnings.id,
      over_number: overNumber,
      ball_in_over: ballInOver,
      striker_id: inningsState.strikerId!,
      non_striker_id: inningsState.nonStrikerId!,
      bowler_id: currentBowlerId,
      runs_batter: runsB as 0 | 1 | 2 | 3 | 4 | 6,
      runs_extra: runsEx,
      extra_type: selectedExtraType as ExtraType,
      is_wicket: false,
      wicket_type: null,
      dismissed_player_id: null,
      fielder_id: null,
      is_legal_delivery: isLegal
    };

    await createBallEvent.mutateAsync({
      input: eventInput,
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
    setIncomingBatsmanId(null);
  }

  async function handleLogWicket(event: FormEvent) {
    event.preventDefault();
    if (!activeInnings || !inningsState || !currentBowlerId || !dismissedPlayerId) return;

    const overNumber = Math.floor(inningsState.legalBalls / 6);
    const ballInOver = (inningsState.legalBalls % 6) + 1;
    const runsB = Number(wicketRunsBatter);
    const runsEx = Number(wicketRunsExtra);
    const exType = wicketExtraType || null;

    const newWickets = inningsState.wickets + 1;
    const isAllOut = newWickets >= maxWickets;

    if (!isAllOut && eligibleIncomingBatsmen.length > 0 && !incomingBatsmanId) {
      showToast('Please select an incoming batsman for the next delivery.', 'error');
      return;
    }

    const eventInput: CreateBallEventInput = {
      match_id: matchId,
      innings_id: activeInnings.id,
      over_number: overNumber,
      ball_in_over: ballInOver,
      striker_id: inningsState.strikerId!,
      non_striker_id: inningsState.nonStrikerId!,
      bowler_id: currentBowlerId,
      runs_batter: runsB as 0 | 1 | 2 | 3 | 4 | 6,
      runs_extra: runsEx,
      extra_type: exType as ExtraType | null,
      is_wicket: true,
      wicket_type: wicketType,
      dismissed_player_id: dismissedPlayerId,
      fielder_id: fielderId || null,
      is_legal_delivery: wicketIsLegal
    };

    await createBallEvent.mutateAsync({
      input: eventInput,
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
    playSound('wicket');
    showToast('Wicket!', 'wicket');

    setShowWicketForm(false);
    setWicketType('bowled');
    setDismissedPlayerId('');
    setFielderId('');
    setWicketRunsBatter('0');
    setWicketRunsExtra('0');
    setWicketExtraType('');
    setWicketIsLegal(true);
    setIncomingBatsmanId(null);
  }

  async function handleUndo() {
    if (!activeInnings || ballEvents.length === 0 || !inningsState) return;

    if (window.confirm('Delete the last ball?')) {
      const lastBall = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber).pop();
      const isUndoingWicket = lastBall?.isWicket ?? false;
      const isUndoingFirstBallOfOver = lastBall
        ? ballEvents.filter((e) => e.overNumber === lastBall.overNumber && e.isLegalDelivery).length === 1
        : false;

      const sortedEvents = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      const previousBall = sortedEvents.length >= 2 ? sortedEvents[sortedEvents.length - 2] : null;

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

      setIncomingBatsmanId(null);
      setShowWicketForm(false);
      setShowExtraForm(false);
      setSelectedExtraType(null);
      setWicketType('bowled');
      setDismissedPlayerId('');
      setFielderId('');
      setWicketRunsBatter('0');
      setWicketRunsExtra('0');
      setWicketExtraType('');
      setWicketIsLegal(true);

      if (isUndoingFirstBallOfOver) {
        setHasBowlerBeenChangedThisOver(false);
        setHasBatsmanBeenChangedThisOver(false);
        if (previousBall) {
          setCurrentBowlerId(previousBall.bowlerId);
        }
      }

      if (isUndoingWicket) {
        setHasBatsmanBeenChangedThisOver(false);
      }

      playSound('click');
      showToast('Last ball undone.', 'undo');
    }
  }

  function handleChangeBowler(newBowlerId: string) {
    if (!newBowlerId || !canChangeBowler) return;

    if (newBowlerId === inningsState?.strikerId || newBowlerId === inningsState?.nonStrikerId) {
      showToast('The bowler cannot be the same as the current striker or non-striker.', 'error');
      return;
    }

    setCurrentBowlerId(newBowlerId);
    setHasBowlerBeenChangedThisOver(true);
  }

  function handleChangeStriker(newStrikerId: string) {
    if (!newStrikerId || !canChangeBatsmen || !inningsState) return;

    if (newStrikerId === inningsState.nonStrikerId) {
      showToast('Cannot swap to the same player as the non-striker.', 'error');
      return;
    }

    if (newStrikerId === currentBowlerId) {
      showToast('The striker cannot be the same as the current bowler.', 'error');
      return;
    }

    setIncomingBatsmanId(newStrikerId);
    setHasBatsmanBeenChangedThisOver(true);
  }

  function handleChangeNonStriker(newNonStrikerId: string) {
    if (!newNonStrikerId || !canChangeBatsmen || !inningsState) return;

    if (newNonStrikerId === inningsState.strikerId) {
      showToast('Cannot swap to the same player as the striker.', 'error');
      return;
    }

    if (newNonStrikerId === currentBowlerId) {
      showToast('The non-striker cannot be the same as the current bowler.', 'error');
      return;
    }

    setIncomingBatsmanId(newNonStrikerId);
    setHasBatsmanBeenChangedThisOver(true);
  }

  async function handleCompleteInnings1() {
    if (!activeInnings || !inningsState || activeInnings.innings_number !== 1) return;

    if (window.confirm('Complete Innings 1 and calculate target?')) {
      const targetRuns = inningsState.totalRuns + 1;

      await updateInnings.mutateAsync({
        inningsId: activeInnings.id,
        input: {
          status: 'completed',
          completed_at: new Date().toISOString()
        }
      });

      const innings2 = inningsList.find((i) => i.innings_number === 2);
      if (innings2) {
        await updateInnings.mutateAsync({
          inningsId: innings2.id,
          input: {
            target_runs: targetRuns
          }
        });
      }

      setOpeningStrikerId('');
      setOpeningNonStrikerId('');
      setOpeningBowlerId('');
      setCurrentBowlerId(null);
      setIncomingBatsmanId(null);
      showToast('Innings 1 complete. Target set.', 'info');
      playSound('click');
    }
  }

  async function handleCompleteInnings2() {
    const innings2 = activeInnings;
    if (!innings2 || !inningsState || innings2.innings_number !== 2 || !match) return;

    if (window.confirm('Complete Innings 2 and calculate match result?')) {
      await updateInnings.mutateAsync({
        inningsId: innings2.id,
        input: {
          status: 'completed',
          completed_at: new Date().toISOString()
        }
      });

      const innings1 = inningsList.find((i) => i.innings_number === 1);
      let innings1Runs = 0;

      if (innings1) {
        try {
          const inn1Events = await supabase
            .from('ball_events')
            .select('*')
            .eq('innings_id', innings1.id)
            .order('sequence_number', { ascending: true });

          if (inn1Events.data && inn1Events.data.length > 0) {
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
          innings1Runs = innings1.target_runs ? innings1.target_runs - 1 : 0;
        }
      }

      const innings2Runs = inningsState.totalRuns;

      let innings2CalcRuns = innings2Runs;
      try {
        const inn2Events = await supabase
          .from('ball_events')
          .select('*')
          .eq('innings_id', innings2.id)
          .order('sequence_number', { ascending: true });

        if (inn2Events.data && inn2Events.data.length > 0) {
          const events2 = inn2Events.data.map((row) => ({
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

          const firstEvt2 = events2[0];
          const inn2BattingSquad = matchPlayers.filter((mp) => mp.team === innings2.batting_team);
          const inn2BattingOrder = inn2BattingSquad.map((mp) => mp.player_id);

          const inn2Context: ScoringContext = {
            inningsId: innings2.id,
            openingStrikerId: firstEvt2.strikerId,
            openingNonStrikerId: firstEvt2.nonStrikerId,
            battingOrder: inn2BattingOrder,
            oversPerInnings: match.overs_per_innings,
            playersPerTeam: match.players_per_team,
            targetRuns: innings2.target_runs
          };

          const inn2State = calculateInningsState(inn2Context, events2);
          innings2CalcRuns = inn2State.totalRuns;
        }
      } catch (error) {
        console.error('[Match Completion] Error recalculating Innings 2:', error);
        innings2CalcRuns = innings2Runs;
      }

      let winner: TeamSide | null = null;
      let resultText = '';

      console.log('[Match Completion] Comparing scores - Innings 1:', innings1Runs, 'Innings 2:', innings2CalcRuns, 'Target:', innings2.target_runs);

      if (innings2CalcRuns >= innings2.target_runs!) {
        winner = innings2.batting_team;
        const wicketsLeft = maxWickets - inningsState.wickets;
        const teamName = winner === 'team_a' ? match.team_a_name : match.team_b_name;
        resultText = `${teamName} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
      } else if (innings2CalcRuns < innings1Runs) {
        winner = innings1!.batting_team;
        const runsMargin = innings1Runs - innings2CalcRuns;
        const teamName = winner === 'team_a' ? match.team_a_name : match.team_b_name;
        resultText = `${teamName} won by ${runsMargin} run${runsMargin !== 1 ? 's' : ''}`;
      } else {
        winner = null;
        resultText = 'Match tied';
      }

      console.log('[Match Completion] Result:', resultText, 'Winner:', winner);

      await completeMatch.mutateAsync({
        matchId: match.id,
        winner,
        resultText,
        playerOfMatchId: playerOfMatchId || null
      });

      playSound('victory');
      showToast('Match completed successfully!', 'match');

      try {
        await updateStatsForCompletedMatch(match.id, (msg) => {
          console.log('[Statistics]', msg);
        });

        void queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
        void queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
        void queryClient.invalidateQueries({ queryKey: ['hall-of-fame'] });
        void queryClient.invalidateQueries({ queryKey: ['season-awards'] });
        void queryClient.invalidateQueries({ queryKey: ['completed-matches'] });
      } catch (statsError) {
        console.error('[Statistics] Failed to update player statistics after match completion:', statsError);
        showToast('Match completed, but statistics failed to update. Use Maintenance > Rebuild All Statistics.', 'error');
      }
    }
  }

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

  useEffect(() => {
    if (showWicketForm && inningsState && !wicketJustOpenedRef.current) {
      wicketJustOpenedRef.current = true;
      setDismissedPlayerId(inningsState.strikerId || '');
      setIncomingBatsmanId(null);
    }
    if (!showWicketForm) {
      wicketJustOpenedRef.current = false;
    }
  }, [showWicketForm, inningsState]);

  // ===== Keyboard shortcuts (scoring pad) =====
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!inningsState || !currentBowlerId || activeInnings?.status !== 'in_progress') return;
      if (inningsState.isCompleted || showWicketForm || showExtraForm || needsBowlerSelection) return;
      const shortBoundary = (match?.match_format ?? 'short_boundary') === 'short_boundary';
      const key = event.key.toLowerCase();
      if (key === '1' || key === '2' || key === '3' || key === '4' || (key === '6' && !shortBoundary)) {
        event.preventDefault();
        void handleLogBall(Number(key) as 0 | 1 | 2 | 3 | 4 | 6);
      } else if (key === 'w') {
        event.preventDefault();
        setShowWicketForm(true);
      } else if (key === 'n') {
        event.preventDefault();
        setSelectedExtraType('no_ball');
        setExtraRunsBatter('0');
        setExtraRunsExtra('1');
        setShowExtraForm(true);
      } else if (key === 'b') {
        event.preventDefault();
        setSelectedExtraType('bye');
        setExtraRunsBatter('0');
        setExtraRunsExtra('1');
        setShowExtraForm(true);
      } else if (key === 'l') {
        event.preventDefault();
        setSelectedExtraType('leg_bye');
        setExtraRunsBatter('0');
        setExtraRunsExtra('1');
        setShowExtraForm(true);
      } else if (key === 'z') {
        event.preventDefault();
        if (ballEvents.length > 0) void handleUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inningsState, currentBowlerId, activeInnings?.status, showWicketForm, showExtraForm, needsBowlerSelection, ballEvents.length]);

  // ===== Live record notifications (presentation only) =====
  useEffect(() => {
    const prevLen = prevEventsLenRef.current;
    prevEventsLenRef.current = ballEvents.length;
    const isFirstPopulation = !hasPopulatedRef.current;
    if (ballEvents.length > 0) hasPopulatedRef.current = true;
    if (ballEvents.length <= prevLen) return;
    if (isFirstPopulation || !inningsState) return;

    if (partnership && partnership.runs > partnershipMaxRef.current) {
      if (partnership.runs >= 20) {
        const sName = inningsState.strikerId ? playerMap.get(inningsState.strikerId) ?? 'Batter' : 'Batter';
        const nName = inningsState.nonStrikerId ? playerMap.get(inningsState.nonStrikerId) ?? 'Batter' : 'Batter';
        showToast(`Highest partnership: ${partnership.runs} (${sName} & ${nName})`, 'info');
      }
      partnershipMaxRef.current = partnership.runs;
    }

    if (!fiftyFiredRef.current) {
      for (const [pid, bat] of Object.entries(inningsState.battingStats)) {
        if (bat.runs >= 50 && bat.balls > 0) {
          fiftyFiredRef.current = true;
          showToast(`FIFTY! ${playerMap.get(pid) ?? 'Batter'} off ${bat.balls} balls`, 'six');
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballEvents.length]);

  // ===== Derived display =====

  const isLoading = matchLoading || inningsLoading || playersLoading || eventsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/10 border-t-accent-green" />
          <p className="text-sm font-medium text-slate-400">Loading scoring dashboard...</p>
        </div>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-danger/10">
            <X className="h-8 w-8 text-accent-danger" />
          </div>
          <p className="text-lg font-bold text-white">Unable to Load Match</p>
          <p className="mt-1 text-sm text-slate-300">The match data could not be retrieved.</p>
        </div>
      </div>
    );
  }

  const isMatchCompleted = match.status === 'completed';

  const handleShareScorecard = () => {
    const makeTeam = (events: BallEvent[], name: string): ScorecardTeam => {
      let runs = 0;
      let wickets = 0;
      let balls = 0;
      for (const e of events) {
        runs += e.runsBatter + e.runsExtra;
        if (e.isWicket) wickets += 1;
        if (e.isLegalDelivery) balls += 1;
      }
      return { name, runs, wickets, overs: `${Math.floor(balls / 6)}.${balls % 6}` };
    };
    const teams: ScorecardTeam[] = [];
    if (innings1) teams.push(makeTeam(innings1Events, match.batting_first === 'team_a' ? match.team_a_name : match.team_b_name));
    if (innings2) teams.push(makeTeam(innings2Events, match.batting_first === 'team_a' ? match.team_b_name : match.team_a_name));
    const potmName = match.player_of_match_id ? playerMap.get(match.player_of_match_id) : undefined;
    downloadScorecardPNG({
      matchName: match.match_name,
      date: match.match_date,
      venue: match.venue ?? '',
      resultText: match.result_text ?? '',
      teams,
      potmName
    }, `${match.match_name.replace(/\s+/g, '_')}_scorecard.png`);
    showToast('Scorecard image generated.', 'success');
  };

  if (isMatchCompleted) {
    const isTie = match.winner === null && !match.is_super_over;
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4">
        <div className="w-full text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-green/10">
            <Crown className="h-10 w-10 text-accent-green" />
          </div>
          <Badge variant="success" size="md" className="mb-4">Match Completed</Badge>
          <h2 className="text-2xl font-extrabold text-white">{match.match_name}</h2>
          <p className="mt-1 text-sm text-slate-300">{match.team_a_name} vs {match.team_b_name}</p>
          {match.result_text && (
            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-accent-green/20 bg-accent-green/8 px-6 py-4">
              <p className="text-lg font-extrabold text-accent-green">{match.result_text}</p>
            </div>
          )}
          <div className="mt-8 flex justify-center gap-3">
            <Button onClick={() => navigate('/admin')}>Return to Dashboard</Button>
            <Button variant="secondary" onClick={handleShareScorecard}>
              <Share2 className="h-4 w-4" /> Share Scorecard
            </Button>
          </div>

          {isTie && (
            <div className="mx-auto mt-6 max-w-sm">
              <div className="rounded-2xl border border-accent-warning/20 bg-accent-warning/8 p-6">
                <h3 className="text-base font-extrabold text-white">Super Over Required</h3>
                <p className="mt-1 text-sm text-slate-300">This match ended in a tie. Start a Super Over to determine the winner.</p>
                <form className="mt-4 flex flex-col gap-3" onSubmit={createSuperOver}>
                  <TextField label="Super Over Name" value={superOverName} onChange={(e) => setSuperOverName(e.target.value)} required />
                  <Button disabled={startSuperOver.isPending}>Start Super Over</Button>
                  <MutationStatus error={startSuperOver.error} />
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (match.status === 'draft' || match.status === 'scheduled' || match.status === 'teams_created') {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center px-4">
        <div className="w-full text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-warning/10">
            <RotateCcw className="h-8 w-8 text-accent-warning" />
          </div>
          <Badge variant="warning" size="md" className="mb-3">Toss Pending</Badge>
          <p className="text-base font-bold text-white">Toss Required to Start Scoring</p>
          <p className="mt-1 text-sm text-slate-300">Conduct the toss first to record the winner and their batting decision.</p>
          <div className="mt-6">
            <Button onClick={() => navigate(`/admin/matches/${matchId}/toss`)}>Go to Toss Page</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeInnings) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-danger/10">
            <X className="h-8 w-8 text-accent-danger" />
          </div>
          <p className="text-lg font-bold text-white">Innings Not Found</p>
          <p className="mt-1 text-sm text-slate-300">Active innings could not be determined.</p>
        </div>
      </div>
    );
  }

  const battingTeamName = activeInnings.batting_team === 'team_a' ? match.team_a_name : match.team_b_name;
  const bowlingTeamName = activeInnings.bowling_team === 'team_a' ? match.team_a_name : match.team_b_name;
  const matchFormat = (match.match_format as 'short_boundary' | 'long_boundary') || 'short_boundary';
  const isShortBoundary = matchFormat === 'short_boundary';

  // 1. INNINGS NOT STARTED, OR STARTED BUT NO DELIVERIES RECORDED YET
  // The opening players exist only in client-side state and are only persisted to the DB by
  // the first ball event. If the scorer refreshes after starting an innings but before the
  // first delivery, there is no event to derive the opening players from (inningsState is
  // null). Re-show the same setup form so the innings can be recovered and continued.
  // The gate keys off `ballEvents.length === 0` (no deliveries yet) AND `startInningsRequested`
  // so the form stays mounted while the opening players are being picked and only exits once
  // the Start/Continue button has run handleStartInnings successfully.
  const showOpeningSetup = activeInnings.status === 'not_started' || (activeInnings.status === 'in_progress' && ballEvents.length === 0 && !startInningsRequested);
  if (showOpeningSetup) {
    const resumingInnings = activeInnings.status === 'in_progress';
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}>
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-blue/10">
              <Crown className="h-10 w-10 text-accent-blue" />
            </div>
            <Badge variant="info" size="md" className="mb-3">
              Innings {activeInnings.innings_number}
            </Badge>
            <h2 className="text-xl font-extrabold text-white">
              {battingTeamName} {activeInnings.innings_number === 1 ? 'Bats First' : 'Chasing'}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {resumingInnings
                ? `This innings was started but no deliveries were recorded. Select the opening players to continue scoring.`
                : `${match.match_name} • ${bowlingTeamName} bowling`}
            </p>

            {activeInnings.target_runs && (
              <div className="mx-auto mt-4 max-w-[200px] rounded-2xl border border-accent-blue/20 bg-accent-blue/8 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">Target</p>
                <p className="text-2xl font-extrabold text-accent-blue">{activeInnings.target_runs}</p>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-white/8 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="mb-4 text-sm font-extrabold text-white">Select Opening Players</h3>
            <form className="flex flex-col gap-4" onSubmit={handleStartInnings}>
              <SelectField label="Opening Striker" value={openingStrikerId} onChange={(e) => setOpeningStrikerId(e.target.value)} required>
                <option value="">Select striker</option>
                {squads.batting.map((mp) => (
                  <option key={mp.player_id} value={mp.player_id} disabled={mp.player_id === openingNonStrikerId}>
                    {playerMap.get(mp.player_id) ?? 'Player'}
                  </option>
                ))}
              </SelectField>

              <SelectField label="Opening Non-Striker" value={openingNonStrikerId} onChange={(e) => setOpeningNonStrikerId(e.target.value)} required>
                <option value="">Select non-striker</option>
                {squads.batting.map((mp) => (
                  <option key={mp.player_id} value={mp.player_id} disabled={mp.player_id === openingStrikerId}>
                    {playerMap.get(mp.player_id) ?? 'Player'}
                  </option>
                ))}
              </SelectField>

              <SelectField label="Opening Bowler" value={openingBowlerId} onChange={(e) => setOpeningBowlerId(e.target.value)} required>
                <option value="">Select bowler</option>
                {squads.bowling.map((mp) => (
                  <option key={mp.player_id} value={mp.player_id}>{playerMap.get(mp.player_id) ?? 'Player'}</option>
                ))}
              </SelectField>

              <Button disabled={updateInnings.isPending}>Start Innings</Button>
              <MutationStatus error={updateInnings.error} />
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== Innings in progress - shared sub-components =====

  const BallChip = ({ ball, index }: { ball: typeof lastSixBalls[number]; index: number }) => {
    const color = ball.isWicket ? 'bg-accent-danger/20 text-accent-danger border-accent-danger/30'
      : ball.runs === 6 ? 'bg-accent-warning/20 text-accent-warning border-accent-warning/30'
      : ball.runs === 4 ? 'bg-accent-green/20 text-accent-green border-accent-green/30'
      : ball.runs === 0 && ball.extra ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/30'
      : ball.runs === 0 ? 'bg-white/5 text-slate-400 border-white/10'
      : 'bg-white/10 text-white border-white/20';
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.3, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: index * 0.07, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
        whileHover={{ scale: 1.15, transition: { duration: 0.15 } }}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-extrabold shadow-lg ${color}`}
      >
        {ball.label}
      </motion.span>
    );
  };

  // 2. INNINGS IN PROGRESS
  return (
    <div className="relative min-h-screen">
      {/* Background - stadium atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[60vh] w-[60vw] -translate-x-1/2 rounded-full bg-accent-green/3 blur-[160px]" />
        <div className="absolute right-0 top-1/3 h-[40vh] w-[40vw] rounded-full bg-accent-blue/3 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[30vh] w-[50vw] rounded-full bg-accent-warning/2 blur-[120px]" />
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.03),transparent_70%)]" />
      </div>

      <div className="relative z-10 page-container mx-auto max-w-7xl px-3 pb-8 pt-3 md:px-6 md:pt-4">

        {/* ===== HERO SECTION ===== */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
          className="relative mb-5 overflow-hidden rounded-2xl border border-white/8 bg-white/5 backdrop-blur-xl md:rounded-[18px]"
        >
          {/* Gradient top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-accent-green via-emerald-400 to-accent-green" />

          <div className="p-4 md:p-6">
            {/* Top row: match name, live badge, innings label */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Badge variant="success" size="sm" className="!px-2.5">
                <span className="relative mr-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green" />
                </span>
                <span>LIVE</span>
              </Badge>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {activeInnings.innings_number === 1 ? '1st Innings' : '2nd Innings'}
              </span>
              <span className="hidden text-xs text-white/15 md:inline">•</span>
              <span className="hidden truncate text-xs font-medium text-slate-300 md:inline">{match.match_name}</span>
              <span className="hidden text-xs text-white/15 md:inline">•</span>
              <span className="hidden text-xs text-slate-400 md:inline">{battingTeamName} vs {bowlingTeamName}</span>
              <Badge variant={isShortBoundary ? 'warning' : 'success'} size="sm" className="!px-2.5">
                {isShortBoundary ? 'SHORT BOUNDARY' : 'LONG BOUNDARY'}
              </Badge>
              <button
                onClick={toggleSoundMuted}
                title={soundMuted ? 'Sound is off — click to enable' : 'Sound is on — click to mute'}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-all hover:scale-105 hover:bg-white/10 hover:text-white"
              >
                {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
              </button>
            </div>

            {/* Score row */}
            <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2 md:mt-4">
              <div className="relative flex items-baseline gap-1">
                {/* Flash layer for boundaries / wickets */}
                <AnimatePresence>
                  {scoreFlash && (
                    <motion.span
                      key={`${inningsState?.totalRuns}-${scoreFlash}`}
                      initial={{ opacity: 0.85, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.06 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.85, ease: 'easeOut' }}
                      className={`pointer-events-none absolute -inset-2 -z-10 rounded-2xl blur-xl ${
                        scoreFlash === 'wicket'
                          ? 'bg-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                          : 'bg-emerald-500/25 shadow-[0_0_30px_rgba(34,197,94,0.5)]'
                      }`}
                    />
                  )}
                </AnimatePresence>

                <span
                  className={`text-5xl font-extrabold tracking-tight md:text-6xl tabular-nums transition-colors duration-500 ${
                    scoreFlash === 'wicket' ? 'text-red-400' : scoreFlash === 'boundary' ? 'text-emerald-300' : 'text-white'
                  }`}
                >
                  <CountUp value={inningsState?.totalRuns ?? 0} duration={550} />
                </span>
                <span className="text-3xl font-extrabold text-slate-500 md:text-4xl">/</span>
                <span className="text-5xl font-extrabold tracking-tight text-white md:text-6xl tabular-nums">
                  <CountUp value={inningsState?.wickets ?? 0} duration={550} />
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-lg font-bold text-white/60 md:text-xl">
                  {inningsState?.oversDisplay ?? '0.0'} <span className="text-xs font-medium text-slate-400">ov</span>
                </span>
                <span className="text-sm text-slate-500">•</span>
                <span className="text-sm font-semibold text-white/70">
                  CRR: <span className="text-accent-green">{inningsState?.currentRunRate.toFixed(2) ?? '0.00'}</span>
                </span>
                {inningsState?.requiredRunRate != null && (
                  <>
                    <span className="text-sm text-slate-500">•</span>
                    <span className="text-sm font-semibold text-white/70">
                      RRR: <span className="text-accent-warning">{inningsState.requiredRunRate.toFixed(2)}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Chase info row */}
            {activeInnings.target_runs != null && inningsState && (
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
                  <span className="text-xs font-medium text-slate-400">Target</span>
                  <span className="text-sm font-extrabold text-white">{activeInnings.target_runs}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
                  <span className="text-xs font-medium text-slate-400">Need</span>
                  <span className="text-sm font-extrabold text-accent-warning">{inningsState.runsRequired ?? '-'}</span>
                  {inningsState.ballsRemaining != null && (
                    <span className="text-xs text-slate-300">from {inningsState.ballsRemaining} balls</span>
                  )}
                </div>
              </div>
            )}

            {/* Partnership & last wicket + momentum row */}
            <div className="mt-3 flex flex-wrap items-center gap-4 md:mt-4">
              {partnership && (
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
                  <span className="text-xs font-medium text-slate-400">Partnership</span>
                  <span className="text-sm font-extrabold text-white">{partnership.runs}</span>
                  <span className="text-xs text-slate-300">({partnership.balls})</span>
                  {partnership.fours > 0 && <span className="text-[11px] font-bold text-accent-green">{partnership.fours}x4</span>}
                  {partnership.sixes > 0 && <span className="text-[11px] font-bold text-accent-warning">{partnership.sixes}x6</span>}
                </div>
              )}
              {/* Last Wicket (most recent wicket in ball events) */}
              {(() => {
                const lastWicketEvent = [...ballEvents].reverse().find((e) => e.isWicket);
                if (!lastWicketEvent || !inningsState) return null;
                const stats = inningsState.battingStats[lastWicketEvent.dismissedPlayerId ?? ''];
                return (
                  <div className="flex items-center gap-2 rounded-lg bg-accent-danger/8 px-3 py-1.5">
                    <span className="text-xs font-medium text-slate-400">Last Wkt</span>
                    <span className="text-sm font-extrabold text-accent-danger">
                      {playerMap.get(lastWicketEvent.dismissedPlayerId ?? '') ?? 'Player'}
                    </span>
                    {stats && (
                      <span className="text-xs text-slate-300">{stats.runs}({stats.balls})</span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Commentary strip - last 6 balls */}
            {lastSixBalls.length > 0 && (
              <div className="mt-3 flex items-center gap-2 md:mt-4">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">Last 6</span>
                <div className="flex gap-1.5">
                  {lastSixBalls.map((ball, i) => (
                    <BallChip key={ball.key} ball={ball} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Momentum timeline bar (last 12 balls) */}
            {momentumSegments.length > 0 && (
              <div className="mt-3 flex items-center gap-2 md:mt-4">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">Momentum</span>
                <div className="flex flex-1 gap-[3px]">
                  {momentumSegments.map((type, i) => {
                    const colors = {
                      wicket: 'bg-accent-danger shadow-[0_0_8px_rgba(239,68,68,0.45)]',
                      six: 'bg-accent-warning shadow-[0_0_8px_rgba(245,158,11,0.45)]',
                      four: 'bg-accent-green shadow-[0_0_8px_rgba(34,197,94,0.45)]',
                      run: 'bg-accent-blue shadow-[0_0_6px_rgba(56,189,248,0.3)]',
                      extra: 'bg-white/30',
                      dot: 'bg-white/10'
                    };
                    const label = type === 'wicket' ? 'Wicket' : type === 'six' ? 'Six' : type === 'four' ? 'Four' : type === 'run' ? 'Run' : type === 'extra' ? 'Extra' : 'Dot ball';
                    return (
                      <motion.div
                        key={`${type}-${i}`}
                        initial={{ opacity: 0, scaleY: 0, height: 2 }}
                        animate={{ opacity: 1, scaleY: 1, height: 16 }}
                        transition={{ delay: i * 0.025, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className={`flex-1 rounded-full ${colors[type]} hover:brightness-125 cursor-default`}
                        title={label}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ===== Innings Complete Banner ===== */}
        <AnimatePresence>
          {inningsState?.isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
              className="mb-5"
            >
              <div className="rounded-2xl border border-accent-warning/20 bg-gradient-to-br from-accent-warning/10 to-amber-900/10 p-6 text-center backdrop-blur-xl">
                <Badge variant="warning" size="md" className="mb-3">Innings Complete</Badge>
                <p className="text-2xl font-extrabold text-white">
                  {battingTeamName}: {inningsState.totalRuns}/{inningsState.wickets}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {inningsState.totalRuns} runs in {inningsState.oversDisplay} overs
                </p>
                <div className="mt-6 flex flex-col items-center gap-3">
                  {activeInnings.innings_number === 1 ? (
                    <Button onClick={handleCompleteInnings1} disabled={updateInnings.isPending}>
                      Proceed to 2nd Innings
                    </Button>
                  ) : (
                    <>
                      <div className="w-full max-w-xs space-y-3">
                        {potmParams && (
                          <POTMRecommendation
                            events={potmParams.events}
                            playerMap={playerMap}
                            chasePlayerIds={potmParams.chasePlayerIds}
                            chaseState={potmParams.chaseState}
                            photoMap={playerPhotoMap}
                            onSelect={(id) => setPlayerOfMatchId(id)}
                          />
                        )}
                        <SelectField label="Player of the Match" value={playerOfMatchId} onChange={(e) => setPlayerOfMatchId(e.target.value)}>
                          <option value="">Select Player</option>
                          {matchPlayers.map((p) => (
                            <option key={p.player_id} value={p.player_id}>{playerMap.get(p.player_id) ?? p.player_id}</option>
                          ))}
                        </SelectField>
                      </div>
                      <Button onClick={handleCompleteInnings2} disabled={updateInnings.isPending || completeMatch.isPending}>
                        Complete Match
                      </Button>
                    </>
                  )}
                </div>
                <div className="mt-4">
                  <MutationStatus error={updateInnings.error || completeMatch.error} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== MAIN CONTENT (3-col) ===== */}
        {!inningsState?.isCompleted && inningsState ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

            {/* ---- LEFT: Current Batsmen ---- */}
            <motion.div
              className="space-y-4 lg:col-span-3"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
            >
              {/* Striker */}
              <div className="relative overflow-hidden rounded-2xl border border-accent-green/25 bg-gradient-to-br from-accent-green/10 to-emerald-900/10 p-5 backdrop-blur-xl">
                {/* Animated glow border */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-accent-green/30 ring-inset" />
                <div className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-30 blur-sm" style={{ boxShadow: '0 0 20px rgba(34,197,94,0.3), 0 0 40px rgba(34,197,94,0.15)' }} />

                <div className="relative flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-green/20 text-lg font-extrabold text-accent-green">
                      {inningsState.strikerId ? (playerMap.get(inningsState.strikerId) ?? '?')[0] : '?'}
                    </div>
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-60" />
                      <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent-green text-[7px] font-extrabold text-white">S</span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold text-white">
                      {inningsState.strikerId ? playerMap.get(inningsState.strikerId) : '—'}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-green">Striker</span>
                  </div>
                </div>

                {inningsState.strikerId && inningsState.battingStats[inningsState.strikerId] && (
                  <div className="relative mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white/5 p-2.5 text-center">
                      <p className="text-2xl font-extrabold text-white">{inningsState.battingStats[inningsState.strikerId].runs}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Runs</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2.5 text-center">
                      <p className="text-2xl font-extrabold text-white">{inningsState.battingStats[inningsState.strikerId].balls}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Balls</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2.5 text-center">
                      <p className="text-2xl font-extrabold text-accent-green">{inningsState.battingStats[inningsState.strikerId].strikeRate.toFixed(1)}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">SR</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 text-center">
                      <p className="font-bold text-white">{inningsState.battingStats[inningsState.strikerId].fours}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">4s</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 text-center">
                      <p className="font-bold text-white">{inningsState.battingStats[inningsState.strikerId].sixes}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">6s</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 text-center">
                      <p className="font-bold text-white">{inningsState.battingStats[inningsState.strikerId].balls === 0 ? '-' : (inningsState.battingStats[inningsState.strikerId].runs / inningsState.battingStats[inningsState.strikerId].balls).toFixed(1)}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">R/B</p>
                    </div>
                  </div>
                )}

                {inningsState.strikerId && inningsState.battingStats[inningsState.strikerId]?.balls === 0 && remainingBatsmen.length > 0 && (
                  <div className="mt-3">
                    <SelectField value={inningsState.strikerId} onChange={(e) => setIncomingBatsmanId(e.target.value)}>
                      <option value={inningsState.strikerId}>Swap batsman</option>
                      {remainingBatsmen.map((id) => (
                        <option key={id} value={id}>{playerMap.get(id)}</option>
                      ))}
                    </SelectField>
                  </div>
                )}
              </div>

              {/* Non-Striker */}
              <div className="rounded-2xl border border-white/8 bg-white/5 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-extrabold text-white/70">
                    {inningsState.nonStrikerId ? (playerMap.get(inningsState.nonStrikerId) ?? '?')[0] : '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold text-white">
                      {inningsState.nonStrikerId ? playerMap.get(inningsState.nonStrikerId) : '—'}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Non-Striker</span>
                  </div>
                </div>

                {inningsState.nonStrikerId && inningsState.battingStats[inningsState.nonStrikerId] && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white/5 p-2.5 text-center">
                      <p className="text-2xl font-extrabold text-white">{inningsState.battingStats[inningsState.nonStrikerId].runs}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Runs</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2.5 text-center">
                      <p className="text-2xl font-extrabold text-white">{inningsState.battingStats[inningsState.nonStrikerId].balls}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Balls</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2.5 text-center">
                      <p className="text-2xl font-extrabold text-white">{inningsState.battingStats[inningsState.nonStrikerId].strikeRate.toFixed(1)}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">SR</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 text-center">
                      <p className="font-bold text-white">{inningsState.battingStats[inningsState.nonStrikerId].fours}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">4s</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 text-center">
                      <p className="font-bold text-white">{inningsState.battingStats[inningsState.nonStrikerId].sixes}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">6s</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 text-center">
                      <p className="font-bold text-white">{inningsState.battingStats[inningsState.nonStrikerId].balls === 0 ? '-' : (inningsState.battingStats[inningsState.nonStrikerId].runs / inningsState.battingStats[inningsState.nonStrikerId].balls).toFixed(1)}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">R/B</p>
                    </div>
                  </div>
                )}

                {inningsState.nonStrikerId && inningsState.battingStats[inningsState.nonStrikerId]?.balls === 0 && remainingBatsmen.length > 0 && (
                  <div className="mt-3">
                    <SelectField value={inningsState.nonStrikerId} onChange={(e) => setIncomingBatsmanId(e.target.value)}>
                      <option value={inningsState.nonStrikerId}>Swap batsman</option>
                      {remainingBatsmen.map((id) => (
                        <option key={id} value={id}>{playerMap.get(id)}</option>
                      ))}
                    </SelectField>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ---- CENTER: Scoring Pad + Run Rate Bar ---- */}
            <motion.div
              className="space-y-4 lg:col-span-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] as const }}
            >
              {/* Run Rate Visual */}
              {inningsState.targetRuns != null && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-3 backdrop-blur-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-accent-green">CRR {inningsState.currentRunRate.toFixed(2)}</span>
                    <span className="font-bold text-accent-warning">RRR {inningsState.requiredRunRate?.toFixed(2) ?? '-'}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-accent-green via-accent-warning to-accent-danger"
                      initial={{ width: '50%' }}
                      animate={{
                        width: `${inningsState.requiredRunRate != null
                          ? Math.min((inningsState.currentRunRate / Math.max(inningsState.requiredRunRate, 0.1)) * 100, 100)
                          : 50}%`
                      }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>CRR ahead</span>
                    <span>RRR ahead</span>
                  </div>
                </div>
              )}

              {/* ---- Scoring Controls ---- */}
              <div>
                <AnimatePresence mode="wait">

                  {/* WICKET FORM */}
                  {showWicketForm && (
                    <motion.div
                      key="wicket-form"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="rounded-2xl border border-accent-danger/25 bg-gradient-to-br from-accent-danger/10 to-red-900/10 p-5 backdrop-blur-xl">
                        <div className="mb-4 flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-danger/20">
                            <Zap className="h-4 w-4 text-accent-danger" />
                          </div>
                          <span className="text-base font-extrabold text-white">Log Wicket</span>
                        </div>
                        <form onSubmit={handleLogWicket} className="flex flex-col gap-3">
                          <SelectField label="Dismissal Type" value={wicketType} onChange={(e) => setWicketType(e.target.value as WicketType)} required>
                            <option value="bowled">Bowled</option>
                            <option value="caught">Caught</option>
                            <option value="lbw">LBW</option>
                            <option value="stumped">Stumped</option>
                            <option value="run_out">Run Out</option>
                            <option value="hit_wicket">Hit Wicket</option>
                          </SelectField>

                          <SelectField label="Dismissed Batsman" value={dismissedPlayerId} onChange={(e) => setDismissedPlayerId(e.target.value)} required>
                            <option value="">Select dismissed player</option>
                            {inningsState.strikerId && <option value={inningsState.strikerId}>{playerMap.get(inningsState.strikerId)} (Striker)</option>}
                            {inningsState.nonStrikerId && <option value={inningsState.nonStrikerId}>{playerMap.get(inningsState.nonStrikerId)} (Non-Striker)</option>}
                          </SelectField>

                          <SelectField label="Fielder" value={fielderId} onChange={(e) => setFielderId(e.target.value)}>
                            <option value="">Select fielder (optional)</option>
                            {squads.bowling.map((mp) => (
                              <option key={mp.player_id} value={mp.player_id}>{playerMap.get(mp.player_id)}</option>
                            ))}
                          </SelectField>

                          {wicketType === 'run_out' && (
                            <div className="grid grid-cols-2 gap-3">
                              <SelectField label="Runs Off Bat" value={wicketRunsBatter} onChange={(e) => setWicketRunsBatter(e.target.value)}>
                                <option value="0">0 runs</option>
                                <option value="1">1 run</option>
                                <option value="2">2 runs</option>
                                <option value="3">3 runs</option>
                              </SelectField>
                              <SelectField label="Extra Type" value={wicketExtraType} onChange={(e) => setWicketExtraType(e.target.value as ExtraType | '')}>
                                <option value="">Legal ball</option>
                                <option value="wide">Wide</option>
                                <option value="no_ball">No Ball</option>
                                <option value="bye">Bye</option>
                                <option value="leg_bye">Leg Bye</option>
                              </SelectField>
                            </div>
                          )}

                          {(() => {
                            const newWickets = inningsState.wickets + 1;
                            const isAllOut = newWickets >= maxWickets;

                            if (isAllOut || eligibleIncomingBatsmen.length === 0) return null;

                            return (
                              <SelectField label="Incoming Batsman" value={incomingBatsmanId || ''} onChange={(e) => setIncomingBatsmanId(e.target.value)} required>
                                <option value="">Select incoming batsman</option>
                                {eligibleIncomingBatsmen.map((id) => (
                                  <option key={id} value={id}>{playerMap.get(id)}</option>
                                ))}
                              </SelectField>
                            );
                          })()}

                          <div className="flex gap-2">
                            <Button type="submit" variant="danger" className="flex-1" disabled={createBallEvent.isPending}>Save Wicket</Button>
                            <Button type="button" variant="ghost" onClick={() => setShowWicketForm(false)}>Cancel</Button>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  )}

                  {/* EXTRA FORM */}
                  {!showWicketForm && showExtraForm && (
                    <motion.div
                      key="extra-form"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="rounded-2xl border border-accent-blue/25 bg-gradient-to-br from-accent-blue/10 to-blue-900/10 p-5 backdrop-blur-xl">
                        <div className="mb-4 flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-blue/20">
                            <Plus className="h-4 w-4 text-accent-blue" />
                          </div>
                          <span className="text-base font-extrabold text-white">
                            Log Extra — {selectedExtraType === 'wide' ? 'Wide' : selectedExtraType === 'no_ball' ? 'No Ball' : selectedExtraType === 'bye' ? 'Bye' : 'Leg Bye'}
                          </span>
                        </div>
                        <form onSubmit={handleLogExtra} className="flex flex-col gap-3">
                            {selectedExtraType === 'no_ball' && (
                            <SelectField label="Runs Off Bat" value={extraRunsBatter} onChange={(e) => setExtraRunsBatter(e.target.value)}>
                              <option value="0">0 runs</option>
                              <option value="1">1 run</option>
                              <option value="2">2 runs</option>
                              <option value="3">3 runs</option>
                              <option value="4">4 runs</option>
                              {!isShortBoundary && <option value="6">6 runs</option>}
                            </SelectField>
                            )}
                          <SelectField
                            label={selectedExtraType === 'wide' || selectedExtraType === 'no_ball' ? 'Total Extras' : 'Runs Completed'}
                            value={extraRunsExtra}
                            onChange={(e) => setExtraRunsExtra(e.target.value)}
                          >
                            <option value="1">1 run</option>
                            <option value="2">2 runs</option>
                            <option value="3">3 runs</option>
                            <option value="4">4 runs</option>
                            {selectedExtraType === 'wide' && <option value="5">5 runs (4 boundary + 1 wide)</option>}
                          </SelectField>
                          <div className="flex gap-2">
                            <Button type="submit" className="flex-1" disabled={createBallEvent.isPending}>Save Extra</Button>
                            <Button type="button" variant="ghost" onClick={() => { setShowExtraForm(false); setSelectedExtraType(null); }}>Cancel</Button>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  )}

                  {/* CHANGE BOWLER (before first legal ball of over) */}
                  {canChangeBowler && !needsBowlerSelection && !showWicketForm && !showExtraForm && (
                    <motion.div
                      key="change-bowler"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="rounded-2xl border border-accent-blue/25 bg-gradient-to-br from-accent-blue/10 to-blue-900/10 p-5 backdrop-blur-xl">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-base font-extrabold text-white">Change Bowler</span>
                        </div>
                        <p className="mb-3 text-xs text-slate-300">
                          Bowler can only be changed before the first legal ball of the over.
                        </p>
                        <div className="flex flex-col gap-2">
                          <SelectField label="" value={currentBowlerId || ''} onChange={(e) => handleChangeBowler(e.target.value)}>
                            <option value="">Select bowler</option>
                            {squads.bowling.map((mp) => (
                              <option
                                key={mp.player_id}
                                value={mp.player_id}
                                disabled={mp.player_id === inningsState.strikerId || mp.player_id === inningsState.nonStrikerId}
                              >
                                {playerMap.get(mp.player_id) ?? 'Player'}
                                {(mp.player_id === inningsState.strikerId || mp.player_id === inningsState.nonStrikerId) ? ' (Currently batting)' : ''}
                              </option>
                            ))}
                          </SelectField>
                          <Button type="button" variant="secondary" onClick={() => setHasBowlerBeenChangedThisOver(true)}>
                            Done
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* CHANGE BATSMEN (before first legal ball of over) */}
                  {canChangeBatsmen && !needsBowlerSelection && !showWicketForm && !showExtraForm && (
                    <motion.div
                      key="change-batsmen"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="rounded-2xl border border-accent-blue/25 bg-gradient-to-br from-accent-blue/10 to-blue-900/10 p-5 backdrop-blur-xl">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-base font-extrabold text-white">Change Batsmen</span>
                        </div>
                        <p className="mb-3 text-xs text-slate-300">
                          Batsmen can only be changed before the first legal ball of the over.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-white/60">Striker</label>
                            <SelectField value={inningsState.strikerId || ''} onChange={(e) => handleChangeStriker(e.target.value)}>
                              <option value={inningsState.strikerId || ''}>
                                {inningsState.strikerId ? playerMap.get(inningsState.strikerId) : 'Select'}
                              </option>
                              {remainingBatsmen.map((id) => (
                                <option key={id} value={id}>{playerMap.get(id)}</option>
                              ))}
                            </SelectField>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-white/60">Non-Striker</label>
                            <SelectField value={inningsState.nonStrikerId || ''} onChange={(e) => handleChangeNonStriker(e.target.value)}>
                              <option value={inningsState.nonStrikerId || ''}>
                                {inningsState.nonStrikerId ? playerMap.get(inningsState.nonStrikerId) : 'Select'}
                              </option>
                              {remainingBatsmen.map((id) => (
                                <option key={id} value={id}>{playerMap.get(id)}</option>
                              ))}
                            </SelectField>
                          </div>
                        </div>
                        <Button type="button" variant="secondary" className="mt-3 w-full" onClick={() => setHasBatsmanBeenChangedThisOver(true)}>
                          Done
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* BOWLER SELECTION */}
                  {!showWicketForm && !showExtraForm && needsBowlerSelection && (
                    <motion.div
                      key="bowler-select"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="rounded-2xl border border-accent-warning/25 bg-gradient-to-br from-accent-warning/10 to-amber-900/10 p-5 backdrop-blur-xl">
                        <div className="mb-3 flex items-center gap-2">
                          <Badge variant="warning" size="sm">{isOverComplete ? 'Over Complete' : 'Bowler Required'}</Badge>
                        </div>
                        <p className="mb-3 text-sm text-white/60">
                          {isOverComplete ? 'Select a new bowler for the next over.' : 'Select the bowler to start scoring.'}
                        </p>
                        <SelectField label="Select Bowler" value={currentBowlerId || ''} onChange={(e) => setCurrentBowlerId(e.target.value)} required>
                          <option value="">Select bowler</option>
                          {squads.bowling.map((mp) => (
                            <option key={mp.player_id} value={mp.player_id} disabled={mp.player_id === lastEvent?.bowlerId}>
                              {playerMap.get(mp.player_id)} {mp.player_id === lastEvent?.bowlerId ? '(Bowled last over)' : ''}
                            </option>
                          ))}
                        </SelectField>
                        <Button type="button" className="mt-2 w-full" onClick={() => setHasBowlerBeenChangedThisOver(true)} disabled={!currentBowlerId || currentBowlerId === lastEvent?.bowlerId}>
                          Confirm Bowler
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* SCORING PAD */}
                  {!showWicketForm && !showExtraForm && !needsBowlerSelection && (
                    <motion.div
                      key="scoring-pad"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {/* Runs */}
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-3 backdrop-blur-xl">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Runs</div>
                        <div className="grid grid-cols-6 gap-2">
                          {[0, 1, 2, 3].map((runs) => (
                            <button
                              key={runs}
                              type="button"
                              onClick={() => handleLogBall(runs as any)}
                              disabled={createBallEvent.isPending}
                              className="btn-tactile flex h-16 items-center justify-center rounded-xl text-2xl font-extrabold text-white"
                            >
                              <span className="flex flex-col items-center gap-0.5">
                                {runs === 0 ? <span className="text-3xl leading-none text-slate-300">•</span> : <span className="text-2xl leading-none">{runs}</span>}
                                <kbd className="rounded border border-white/15 bg-white/5 px-1 font-mono text-[9px] font-bold leading-none text-slate-400">{runs}</kbd>
                              </span>
                            </button>
                          ))}
                          {/* 4 */}
                          <motion.button
                            type="button"
                            onClick={() => handleLogBall(4 as any)}
                            disabled={createBallEvent.isPending}
                            className="flex h-16 items-center justify-center rounded-xl bg-gradient-to-br from-accent-green to-emerald-600 text-2xl font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_18px_rgba(34,197,94,0.35)]"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.92 }}
                          >
                            <span className="flex flex-col items-center gap-0.5">
                              <span className="text-2xl leading-none">4</span>
                              <kbd className="rounded border border-white/25 bg-black/25 px-1 font-mono text-[9px] font-bold leading-none text-white/90">4</kbd>
                            </span>
                          </motion.button>
                          {/* 6 */}
                          {!isShortBoundary && (
                            <motion.button
                              type="button"
                              onClick={() => handleLogBall(6 as any)}
                              disabled={createBallEvent.isPending}
                              className="flex h-16 items-center justify-center rounded-xl bg-gradient-to-br from-accent-warning to-amber-600 text-2xl font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_18px_rgba(245,158,11,0.35)]"
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.92 }}
                            >
                              <span className="flex flex-col items-center gap-0.5">
                                <span className="text-2xl leading-none">6</span>
                                <kbd className="rounded border border-white/25 bg-black/25 px-1 font-mono text-[9px] font-bold leading-none text-white/90">6</kbd>
                              </span>
                            </motion.button>
                          )}
                        </div>
                      </div>

                      {/* Extras */}
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-3 backdrop-blur-xl">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Extras</div>
                        <div className="grid grid-cols-4 gap-2">
                          {(['wide', 'no_ball', 'bye', 'leg_bye'] as ExtraType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => { setSelectedExtraType(type); setExtraRunsExtra('1'); setExtraRunsBatter('0'); setShowExtraForm(true); }}
                              disabled={createBallEvent.isPending}
                              className="btn-tactile flex h-12 items-center justify-center rounded-xl text-sm font-bold text-white/85"
                            >
                              {type === 'no_ball' ? 'No Ball' : type === 'leg_bye' ? 'Leg Bye' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <motion.button
                          type="button"
                          onClick={() => setShowWicketForm(true)}
                          disabled={createBallEvent.isPending}
                          className="flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-accent-danger to-red-600 text-base font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_18px_rgba(239,68,68,0.35)]"
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <Zap className="h-5 w-5" />
                          Wicket
                          <kbd className="rounded border border-white/25 bg-black/25 px-1.5 font-mono text-[10px] font-bold leading-none text-white/90">W</kbd>
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={handleUndo}
                          disabled={undoLastBall.isPending || ballEvents.length === 0}
                          className="btn-tactile flex h-14 items-center justify-center gap-2 rounded-xl text-base font-extrabold text-white/85 disabled:opacity-25"
                          whileTap={{ scale: 0.93 }}
                        >
                          <Undo2 className="h-5 w-5" />
                          Undo
                          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 font-mono text-[10px] font-bold leading-none text-slate-400">Z</kbd>
                        </motion.button>
                      </div>

                      {/* Keyboard hints */}
                      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1"><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">1-4</kbd> runs</span>
                        <span className="inline-flex items-center gap-1"><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">6</kbd> six</span>
                        <span className="inline-flex items-center gap-1"><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">W</kbd> wicket</span>
                        <span className="inline-flex items-center gap-1"><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">N</kbd> no ball</span>
                        <span className="inline-flex items-center gap-1"><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">B</kbd> bye</span>
                        <span className="inline-flex items-center gap-1"><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">L</kbd> leg bye</span>
                        <span className="inline-flex items-center gap-1"><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">Z</kbd> undo</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-3">
                  <MutationStatus error={createBallEvent.error || undoLastBall.error} />
                </div>
              </div>
            </motion.div>

            {/* ---- RIGHT: Bowler + Chase ---- */}
            <motion.div
              className="space-y-4 lg:col-span-3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const }}
            >
              {/* Current Bowler */}
              <div className="rounded-2xl border border-accent-blue/20 bg-gradient-to-br from-accent-blue/8 to-blue-900/8 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-blue/20 text-lg font-extrabold text-accent-blue">
                    {currentBowlerId ? (playerMap.get(currentBowlerId) ?? '?')[0] : '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold text-white">
                      {currentBowlerId ? playerMap.get(currentBowlerId) : 'No bowler selected'}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-blue">Bowler</span>
                  </div>
                </div>

                {currentBowlerId && inningsState.bowlingStats[currentBowlerId] && (
                  <>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <div className="rounded-xl bg-white/5 p-2 text-center">
                        <p className="text-sm font-extrabold text-white">{inningsState.bowlingStats[currentBowlerId].oversDisplay}</p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Overs</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-2 text-center">
                        <p className="text-sm font-extrabold text-accent-danger">{inningsState.bowlingStats[currentBowlerId].runsConceded}</p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Runs</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-2 text-center">
                        <p className="text-sm font-extrabold text-accent-blue">{inningsState.bowlingStats[currentBowlerId].wickets}</p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Wkts</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-2 text-center">
                        <p className="text-sm font-extrabold text-white">{inningsState.bowlingStats[currentBowlerId].economy.toFixed(1)}</p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Econ</p>
                      </div>
                    </div>

                    {previousOverStats && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                        <span className="text-xs text-slate-400">Previous Over:</span>
                        <span className="text-sm font-extrabold text-white">{previousOverStats.runs} runs</span>
                        {previousOverStats.wickets > 0 && (
                          <span className="rounded bg-accent-danger/20 px-1.5 py-0.5 text-[11px] font-bold text-accent-danger">{previousOverStats.wickets}w</span>
                        )}
                      </div>
                    )}

                    {inningsState.bowlingStats[currentBowlerId].maidens > 0 && (
                      <Badge variant="success" size="sm" className="mt-2">
                        {inningsState.bowlingStats[currentBowlerId].maidens} maiden{inningsState.bowlingStats[currentBowlerId].maidens > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {/* Ball-by-Ball Timeline */}
              {ballEvents.length > 0 && (
                <BallTimeline ballEvents={ballEvents} playerMap={playerMap} showOvers={3} />
              )}

              {/* Chase Stats - full width ride side */}
              {activeInnings.target_runs != null && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur-xl">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Chase</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span className="text-xs text-slate-300">Target</span>
                      <span className="text-sm font-extrabold text-white">{activeInnings.target_runs}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span className="text-xs text-slate-300">Required</span>
                      <span className="text-sm font-extrabold text-accent-warning">{inningsState.runsRequired ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span className="text-xs text-slate-300">Balls Left</span>
                      <span className="text-sm font-extrabold text-white">{inningsState.ballsRemaining ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span className="text-xs text-slate-300">RRR</span>
                      <span className="text-sm font-extrabold text-accent-green">{inningsState.requiredRunRate?.toFixed(1) ?? '-'}</span>
                    </div>
                  </div>
                  {inningsState.ballsRemaining != null && inningsState.runsRequired != null && inningsState.targetRuns != null && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent-green to-accent-warning"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.max(0, Math.min(((inningsState.targetRuns - inningsState.runsRequired) / inningsState.targetRuns) * 100, 100))}%`
                        }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
                      />
                    </div>
                  )}
                  <div className="mt-4">
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
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
