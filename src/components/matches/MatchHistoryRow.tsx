import type { MatchHistoryItem } from '../../types/models';

interface MatchHistoryRowProps {
  item: MatchHistoryItem;
}

function winnerLabel(item: MatchHistoryItem) {
  if (!item.finalWinner) return 'Pending';
  return item.finalWinner === 'team_a' ? item.match.team_a_name : item.match.team_b_name;
}

export function MatchHistoryRow({ item }: MatchHistoryRowProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-[6rem_1fr] gap-2 text-sm">
        <span className="font-semibold text-slate-500">Match</span>
        <span className="font-bold text-ink">{item.match.match_name}</span>

        <span className="font-semibold text-slate-500">Super Over</span>
        <span>{item.superOver ? item.superOver.match_name : 'Not played'}</span>

        <span className="font-semibold text-slate-500">Final Winner</span>
        <span>{winnerLabel(item)}</span>
      </div>
      {item.finalResultText ? <p className="mt-3 text-sm text-slate-600">{item.finalResultText}</p> : null}
    </article>
  );
}
