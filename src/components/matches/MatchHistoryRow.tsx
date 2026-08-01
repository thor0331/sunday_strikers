import type { MatchHistoryItem } from '../../types/models';
import { useNavigate } from 'react-router-dom';

interface MatchHistoryRowProps {
  item: MatchHistoryItem;
}

function winnerLabel(item: MatchHistoryItem) {
  if (!item.finalWinner) return 'Pending';
  return item.finalWinner === 'team_a' ? item.match.team_a_name : item.match.team_b_name;
}

export function MatchHistoryRow({ item }: MatchHistoryRowProps) {
  const navigate = useNavigate();

  const handleRowClick = () => {
    navigate(`/matches/${item.match.id}`);
  };

  return (
    <article
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer shadow-sm backdrop-blur-xl hover:shadow-lg hover:border-accent-green/40 hover:bg-white/[0.06] transition-all duration-300"
    >
      <div className="grid grid-cols-[6rem_1fr] gap-2 text-sm">
        <span className="font-semibold text-slate-300">Match</span>
        <span className="font-bold text-white">{item.match.match_name}</span>

        <span className="font-semibold text-slate-300">Date</span>
        <span className="text-white/70">{item.match.match_date}</span>

        <span className="font-semibold text-slate-300">Venue</span>
        <span className="text-white/70">{item.match.venue || 'Not specified'}</span>

        <span className="font-semibold text-slate-300">Super Over</span>
        <span className="text-white/70">{item.superOver ? item.superOver.match_name : 'Not played'}</span>

        <span className="font-semibold text-slate-300">Final Winner</span>
        <span className="font-bold text-accent-green">{winnerLabel(item)}</span>
      </div>
      {item.finalResultText ? <p className="mt-3 text-sm text-slate-300">{item.finalResultText}</p> : null}
    </article>
  );
}
