import { usePlayerStatistics } from '../../hooks/useStatistics';
import { useParentMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/common/GlassCard';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { Trophy, Target, Star, Award, Flame, Zap, Shield, TrendingUp, Users, Crown, Swords, Medal } from 'lucide-react';
import { computeMostRuns, computeMostWickets, computeMostPotm, computeMostMatchesPlayed, computeHighestScore, computeBestBowlingFromStats, computeMostSixes, computeHighestStrikeRate, computeBestEconomy, computeMostWinsAsCaptain, computeLongestWinningStreak, computeMostSeasonsPlayed } from '../../utils/hallOfFame';
import type { HallOfFameRecord } from '../../utils/hallOfFame';
import { matchRepository } from '../../repositories/matchRepository';
import { useEffect } from 'react';

export function HallOfFamePage() {
  const { data: stats = [], isLoading: statsLoading } = usePlayerStatistics();
  const { data: matches = [], isLoading: matchesLoading } = useParentMatches();
  const { data: players = [], isLoading: playersLoading } = usePlayers();
  const avatarViewer = useAvatarViewerStore();
  const navigate = useNavigate();

  const [minInnings, setMinInnings] = useState(3);
  const [minOvers, setMinOvers] = useState(6);
  const [partnershipEvents, setPartnershipEvents] = useState<{ matchId: string; strikerId: string; nonStrikerId: string; runsBatter: number; runsExtra: number; isLegalDelivery: boolean }[]>([]);
  const [loadingPartnerships, setLoadingPartnerships] = useState(false);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);
  const photoMap = useMemo(() => new Map(players.map((p) => [p.id, p.photo_url])), [players]);

  useEffect(() => {
    const completed = matches.filter((m) => m.status === 'completed');
    if (completed.length === 0) return;
    let cancelled = false;
    setLoadingPartnerships(true);
    Promise.all(completed.map(async (m) => {
      const innings = await matchRepository.getInnings(m.id);
      const allEvents: { matchId: string; strikerId: string; nonStrikerId: string; runsBatter: number; runsExtra: number; isLegalDelivery: boolean }[] = [];
      for (const inn of innings) {
        const events = await matchRepository.listPlayers ? [] : [];
        try {
          const { supabase } = await import('../../services/supabaseClient');
          const { data } = await supabase.from('ball_events').select('striker_id,non_striker_id,runs_batter,runs_extra,is_legal_delivery').eq('innings_id', inn.id).order('sequence_number');
          if (data) {
            for (const e of data) {
              allEvents.push({ matchId: m.id, strikerId: e.striker_id, nonStrikerId: e.non_striker_id, runsBatter: e.runs_batter, runsExtra: e.runs_extra, isLegalDelivery: e.is_legal_delivery });
            }
          }
        } catch { /* skip */ }
      }
      return allEvents;
    })).then((results) => {
      if (cancelled) return;
      setPartnershipEvents(results.flat());
      setLoadingPartnerships(false);
    }).catch(() => { if (!cancelled) setLoadingPartnerships(false); });
    return () => { cancelled = true; };
  }, [matches]);

  const records = useMemo(() => {
    const r: (HallOfFameRecord & { label: string; icon: React.ReactNode; gradient: string })[] = [];
    const add = (rec: HallOfFameRecord | null, label: string, icon: React.ReactNode, gradient: string) => { if (rec) r.push({ ...rec, label, icon, gradient }); };

    add(computeMostRuns(stats, playerMap, photoMap), 'Most Runs', <TrendingUp className="w-5 h-5" />, 'from-emerald-400 to-emerald-600');
    add(computeMostWickets(stats, playerMap, photoMap), 'Most Wickets', <Target className="w-5 h-5" />, 'from-purple-400 to-purple-600');
    add(computeMostPotm(matches, playerMap, photoMap), 'Most POTM Awards', <Star className="w-5 h-5" />, 'from-amber-400 to-amber-600');
    add(computeMostMatchesPlayed(stats, playerMap, photoMap), 'Most Matches Played', <Crown className="w-5 h-5" />, 'from-blue-400 to-blue-600');
    add(computeHighestScore(stats, playerMap, photoMap), 'Highest Individual Score', <Flame className="w-5 h-5" />, 'from-red-400 to-rose-600');
    add(computeBestBowlingFromStats(stats, playerMap, photoMap), 'Best Bowling Figures', <Award className="w-5 h-5" />, 'from-indigo-400 to-indigo-600');
    add(computeMostSixes(stats, playerMap, photoMap), 'Most Sixes', <span className="text-lg font-bold">6</span>, 'from-pink-400 to-pink-600');
    add(computeHighestStrikeRate(stats, playerMap, photoMap, minInnings), 'Highest Strike Rate', <Zap className="w-5 h-5" />, 'from-yellow-400 to-yellow-600');
    add(computeBestEconomy(stats, playerMap, photoMap, minOvers), 'Best Economy', <Shield className="w-5 h-5" />, 'from-teal-400 to-teal-600');
    add(computeMostWinsAsCaptain(matches, players, playerMap, photoMap), 'Most Wins as Captain', <Swords className="w-5 h-5" />, 'from-orange-400 to-orange-600');
    add(computeLongestWinningStreak(matches, players, playerMap, photoMap), 'Longest Winning Streak', <Medal className="w-5 h-5" />, 'from-cyan-400 to-cyan-600');
    add(computeMostSeasonsPlayed(stats, playerMap, photoMap), 'Most Seasons Played', <Trophy className="w-5 h-5" />, 'from-violet-400 to-violet-600');
    return r;
  }, [stats, matches, players, playerMap, photoMap, minInnings, minOvers]);

  const isLoading = statsLoading || matchesLoading || playersLoading;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Hall of Fame</h1>
        <p className="text-sm text-slate-500 mt-1">Club lifetime achievements</p>
        <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-teal-400 to-teal-600" />
      </div>

      {/* Configurable Thresholds */}
      <div className="flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <label>Min Innings (SR):</label>
          <select value={minInnings} onChange={(e) => setMinInnings(Number(e.target.value))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
            {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <label>Min Overs (Eco):</label>
          <select value={minOvers} onChange={(e) => setMinOvers(Number(e.target.value))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
            {[2, 4, 6, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2"><div className="h-3 w-24 rounded bg-slate-200" /><div className="h-6 w-16 rounded bg-slate-200" /><div className="h-3 w-32 rounded bg-slate-200" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No records yet</p>
          <p className="text-xs text-slate-400 mt-1">Complete matches to see Hall of Fame records.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 stagger-enter">
          {records.map((rec, i) => (
            <GlassCard key={i} variant="light" hover className="p-5 overflow-hidden relative group cursor-pointer" onClick={() => navigate(`/players/${rec.playerId}`)}>
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-4 relative">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${rec.gradient} shadow-lg shadow-black/10 text-white ring-4 ring-white/50`}>
                  {rec.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{rec.label}</p>
                  <p className="text-xl font-extrabold text-slate-800 mt-0.5 tabular-nums">{rec.value}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {rec.playerPhoto ? (
                      <CircularAvatar src={rec.playerPhoto} alt={rec.playerName} size="sm" onClick={() => avatarViewer.open(rec.playerPhoto!, rec.playerName)} />
                    ) : null}
                    <span className="text-sm font-semibold text-slate-600 truncate">{rec.playerName}</span>
                  </div>
                  {rec.subtitle && <p className="text-[11px] text-slate-400 mt-1">{rec.subtitle}</p>}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
