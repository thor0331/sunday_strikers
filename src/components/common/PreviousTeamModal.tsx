import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Calendar, Trophy } from 'lucide-react';
import { matchRepository } from '../../repositories/matchRepository';
import { Button } from '../forms/Button';
import { dialogOverlay, dialogContent } from '../ui/animations';
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
  const [selectedId, setSelectedId] = useState('');
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
      results.forEach((r) => {
        counts[r.id] = { teamA: r.teamA, teamB: r.teamB };
      });
      setPlayerCounts(counts);
      setLoadingCounts(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, eligibleMatches]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <AnimatePresence>
      {isOpen && eligibleMatches.length > 0 && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={dialogOverlay} initial="hidden" animate="visible" exit="exit">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" variants={dialogOverlay} initial="hidden" animate="visible" exit="exit" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md rounded-[18px] border border-white/10 bg-[#0F1B2D]/95 p-6 shadow-2xl backdrop-blur-xl"
            variants={dialogContent}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-green/15">
                  <Trophy className="h-4 w-4 text-accent-green" />
                </div>
                <h3 className="text-lg font-bold text-white">Use Previous Team</h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {eligibleMatches.length === 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-white/60">Import the team setup from this completed match?</p>
                <MatchCard match={eligibleMatches[0]} counts={playerCounts[eligibleMatches[0].id]} formatDate={formatDate} isSelected />
              </div>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                <p className="text-sm text-white/60">Select a completed match to import teams from:</p>
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

            {loadingCounts && <p className="mt-3 text-xs text-slate-400">Loading player counts...</p>}

            <div className="mt-5 flex gap-2">
              <Button onClick={() => selectedId && onImport(selectedId)} disabled={!selectedId || loadingCounts}>
                Import Team
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MatchCardProps {
  match: Match;
  counts?: { teamA: number; teamB: number };
  formatDate: (d: string) => string;
  isSelected: boolean;
  onClick?: () => void;
}

function MatchCard({ match, counts, formatDate, isSelected, onClick }: MatchCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-all duration-150 ${
        isSelected
          ? 'border-accent-green/50 bg-accent-green/10 shadow-[0_0_16px_rgba(34,197,94,0.15)]'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{match.match_name}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-300">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(match.match_date)}</span>
          </div>
        </div>
        {counts && (
          <div className="flex shrink-0 items-center gap-2 text-xs font-medium">
            <span className="flex items-center gap-1 rounded-full bg-accent-blue/15 px-2 py-0.5 text-accent-blue">
              <Users className="h-3 w-3" />
              {counts.teamA}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-accent-warning/15 px-2 py-0.5 text-accent-warning">
              <Users className="h-3 w-3" />
              {counts.teamB}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
