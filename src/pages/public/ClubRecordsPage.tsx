import { PagePanel } from '../../components/common/PagePanel';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { useParentMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useMemo } from 'react';
import { computeHallOfFame } from '../../utils/analytics';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { GlassCard } from '../../components/common/GlassCard';
import { Trophy, Flame, Target, Star, Award, TrendingUp, Users, Zap, Shield } from 'lucide-react';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import type { ReactNode } from 'react';
import type { Match, BallEvent } from '../../types/models';

interface ClubRecordEntry {
  label: string;
  value: string | number;
  playerName: string;
  playerPhoto: string | null;
  playerId: string | null;
  icon: ReactNode;
  gradient: string;
  subtitle?: string;
}

export function ClubRecordsPage() {
  const { data: matches = [] } = useParentMatches();
  const { data: stats = [] } = usePlayerStatistics();
  const { data: players = [] } = usePlayers();
  const avatarViewer = useAvatarViewerStore();

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map(p => [p.id, p.photo_url])), [players]);

  const records = useMemo(() => {
    const result: ClubRecordEntry[] = [];

    // Highest Individual Score
    const topScore = [...stats].sort((a, b) => b.highest_score - a.highest_score)[0];
    if (topScore) {
      result.push({
        label: 'Highest Individual Score',
        value: topScore.highest_score,
        playerName: playerMap.get(topScore.player_id) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(topScore.player_id) ?? null,
        playerId: topScore.player_id,
        icon: <Flame className="w-5 h-5" />,
        gradient: 'from-red-400 to-rose-600',
        subtitle: `${topScore.fours} fours • ${topScore.sixes} sixes`,
      });
    }

    // Most Career Runs
    const mostRuns = [...stats].sort((a, b) => b.runs - a.runs)[0];
    if (mostRuns) {
      const avg = mostRuns.outs > 0 ? (mostRuns.runs / mostRuns.outs).toFixed(1) : '-';
      result.push({
        label: 'Most Career Runs',
        value: mostRuns.runs.toLocaleString(),
        playerName: playerMap.get(mostRuns.player_id) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(mostRuns.player_id) ?? null,
        playerId: mostRuns.player_id,
        icon: <TrendingUp className="w-5 h-5" />,
        gradient: 'from-emerald-400 to-emerald-600',
        subtitle: `Avg: ${avg} • ${mostRuns.matches_played} matches`,
      });
    }

    // Most Career Wickets
    const mostWickets = [...stats].sort((a, b) => b.wickets - a.wickets)[0];
    if (mostWickets) {
      const eco = mostWickets.balls_bowled > 0 ? ((mostWickets.runs_conceded * 6) / mostWickets.balls_bowled).toFixed(1) : '-';
      result.push({
        label: 'Most Career Wickets',
        value: `${mostWickets.wickets} wickets`,
        playerName: playerMap.get(mostWickets.player_id) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(mostWickets.player_id) ?? null,
        playerId: mostWickets.player_id,
        icon: <Target className="w-5 h-5" />,
        gradient: 'from-purple-400 to-purple-600',
        subtitle: `Eco: ${eco} • ${mostWickets.matches_played} matches`,
      });
    }

    // Best Bowling Figures
    const completedMatches = matches.filter(m => m.status === 'completed');
    const bestBowler = mostWickets;
    if (bestBowler) {
      result.push({
        label: 'Best Bowling Figures',
        value: `${bestBowler.wickets} wkts`,
        playerName: playerMap.get(bestBowler.player_id) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(bestBowler.player_id) ?? null,
        playerId: bestBowler.player_id,
        icon: <Award className="w-5 h-5" />,
        gradient: 'from-blue-400 to-blue-600',
        subtitle: `${bestBowler.runs_conceded} runs conceded`,
      });
    }

    // Most POTM Awards
    const potmCounts: Record<string, number> = {};
    for (const m of matches) {
      if (m.player_of_match_id) potmCounts[m.player_of_match_id] = (potmCounts[m.player_of_match_id] ?? 0) + 1;
    }
    const topPotm = Object.entries(potmCounts).sort(([, a], [, b]) => b - a)[0];
    if (topPotm) {
      result.push({
        label: 'Most POTM Awards',
        value: topPotm[1],
        playerName: playerMap.get(topPotm[0]) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(topPotm[0]) ?? null,
        playerId: topPotm[0],
        icon: <Star className="w-5 h-5" />,
        gradient: 'from-amber-400 to-amber-600',
        subtitle: 'Player of the Match awards',
      });
    }

    // Highest Partnership
    result.push({
      label: 'Highest Partnership',
      value: '-',
      playerName: 'Data coming soon',
      playerPhoto: null,
      playerId: null,
      icon: <Users className="w-5 h-5" />,
      gradient: 'from-pink-400 to-pink-600',
      subtitle: 'Best batting partnership',
    });

    // Highest Team Score
    let highestTeamScore = { runs: 0, team: '' };
    for (const match of completedMatches) {
      if (match.result_text) {
        const scoreMatch = match.result_text.match(/(\d+)/);
        if (scoreMatch) {
          const score = parseInt(scoreMatch[1], 10);
          if (score > highestTeamScore.runs) {
            highestTeamScore = { runs: score, team: match.match_name };
          }
        }
      }
    }
    result.push({
      label: 'Highest Team Score',
      value: highestTeamScore.runs > 0 ? highestTeamScore.runs : '-',
      playerName: highestTeamScore.team || 'N/A',
      playerPhoto: null,
      playerId: null,
      icon: <Shield className="w-5 h-5" />,
      gradient: 'from-teal-400 to-teal-600',
      subtitle: highestTeamScore.runs > 0 ? 'Total runs in a match' : 'No data yet',
    });

    return result;
  }, [stats, matches, playerMap, playerPhotoMap]);

  return (
    <div className="space-y-4">
      <PagePanel title="Club Records">
        <p className="text-xs text-slate-500 -mt-2 mb-4">All-time best performances</p>
        <div className="grid gap-4 sm:grid-cols-2 stagger-enter">
          {records.map((rec, i) => (
            <GlassCard key={i} variant="light" hover className="p-5 overflow-hidden relative group">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-4 relative">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${rec.gradient} shadow-lg shadow-black/10 text-white ring-4 ring-white/50`}>
                  {rec.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{rec.label}</p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-0.5 tabular-nums">{rec.value}</p>
                  {rec.playerName && (
                    <div className="flex items-center gap-2 mt-1.5">
                      {rec.playerPhoto && (
                        <CircularAvatar
                          src={rec.playerPhoto}
                          alt={rec.playerName}
                          size="sm"
                          onClick={() => avatarViewer.open(rec.playerPhoto!, rec.playerName)}
                        />
                      )}
                      <span className="text-sm font-semibold text-slate-600 truncate">{rec.playerName}</span>
                    </div>
                  )}
                  {rec.subtitle && (
                    <p className="text-[11px] text-slate-400 mt-1">{rec.subtitle}</p>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </PagePanel>
    </div>
  );
}
