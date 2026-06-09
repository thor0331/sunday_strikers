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
      className="rounded-lg border border-slate-700 bg-slate-800 p-4 cursor-pointer hover:shadow-lg hover:border-teal-600 hover:bg-slate-750 transition-all"
    >
      <div className="grid grid-cols-[6rem_1fr] gap-2 text-sm">
        <span className="font-semibold text-slate-400">Match</span>
        <span className="font-bold text-slate-100">{item.match.match_name}</span>

        <span className="font-semibold text-slate-400">Date</span>
        <span className="text-slate-300">{item.match.match_date}</span>

        <span className="font-semibold text-slate-400">Venue</span>
        <span className="text-slate-300">{item.match.venue || 'Not specified'}</span>

        <span className="font-semibold text-slate-400">Super Over</span>
        <span className="text-slate-300">{item.superOver ? item.superOver.match_name : 'Not played'}</span>

        <span className="font-semibold text-slate-400">Final Winner</span>
        <span className="font-bold text-teal-400">{winnerLabel(item)}</span>
      </div>
      {item.finalResultText ? <p className="mt-3 text-sm text-slate-400">{item.finalResultText}</p> : null}
    </article>
  );
}
