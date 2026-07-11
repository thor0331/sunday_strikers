import { useEffect, useCallback, useMemo, useState } from 'react';
import { X, Users, Calendar, Trophy } from 'lucide-react';
import { matchRepository } from '../../repositories/matchRepository';
import { Button } from '../forms/Button';
import type { Match } from '../../types/models';

interface PreviousTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (matchId: string) => void;
  matches: Match[];
  currentMatchId: string;
}

export function PreviousTeamModal({ isOpen, onClose, onImport, matches, currentMatchId }: PreviousTeamModalProps) {
  const eligibleMatches = useMemo(() => matches.filter((m) => m.id !== currentMatchId), [matches, currentMatchId]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [playerCounts, setPlayerCounts] = useState<Record<string, { teamA: number; teamB: number }>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  useEffect(() => {
    if (eligibleMatches.length > 0 && !selectedId) {
      setSelectedId(eligibleMatches[0].id);
    }
  }, [eligibleMatches, selectedId]);

  useEffect(() => {
    if (!isOpen || eligibleMatches.length === 0) return;
    let cancelled = false;
    setLoadingCounts(true);
    Promise.all(
      eligibleMatches.map(async (m) => {
        const players = await matchRepository.listPlayers(m.id);
        const teamA = players.filter((p) => p.team === 'team_a').length;
        const teamB = players.filter((p) => p.team === 'team_b').length;
        return { id: m.id, teamA, teamB };
      })
    ).then((results) => {
      if (cancelled) return;
      const counts: Record<string, { teamA: number; teamB: number }> = {};
      results.forEach((r) => { counts[r.id] = { teamA: r.teamA, teamB: r.teamB }; });
      setPlayerCounts(counts);
      setLoadingCounts(false);
    });
    return () => { cancelled = true; };
  }, [isOpen, eligibleMatches]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || eligibleMatches.length === 0) return null;

  const selectedMatch = eligibleMatches.find((m) => m.id === selectedId);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in duration-200" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-800">Use Previous Team</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {eligibleMatches.length === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Import the team setup from this completed match?</p>
            <MatchCard match={eligibleMatches[0]} counts={playerCounts[eligibleMatches[0].id]} formatDate={formatDate} isSelected />
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            <p className="text-sm text-slate-600">Select a completed match to import teams from:</p>
            {eligibleMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                counts={playerCounts[match.id]}
                formatDate={formatDate}
                isSelected={match.id === selectedId}
                onClick={() => setSelectedId(match.id)}
              />
            ))}
          </div>
        )}

        {loadingCounts && <p className="text-xs text-slate-400 mt-3">Loading player counts...</p>}

        <div className="flex gap-2 mt-5">
          <Button onClick={() => selectedId && onImport(selectedId)} disabled={!selectedId || loadingCounts}>
            Import Team
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, counts, formatDate, isSelected, onClick }: { match: Match; counts?: { teamA: number; teamB: number }; formatDate: (d: string) => string; isSelected: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-3 transition-all duration-150 ${
        isSelected
          ? 'border-teal-500 bg-teal-50/80 shadow-sm'
          : 'border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-800 truncate">{match.match_name}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(match.match_date)}</span>
          </div>
        </div>
        {counts && (
          <div className="flex items-center gap-2 text-xs font-medium shrink-0">
            <span className="flex items-center gap-1 text-teal-700 bg-teal-100/80 rounded-full px-2 py-0.5">
              <Users className="w-3 h-3" />
              {counts.teamA}
            </span>
            <span className="flex items-center gap-1 text-orange-700 bg-orange-100/80 rounded-full px-2 py-0.5">
              <Users className="w-3 h-3" />
              {counts.teamB}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
