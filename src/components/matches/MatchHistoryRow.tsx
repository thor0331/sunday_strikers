import type { MatchHistoryItem } from '../../types/models';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, MapPin } from 'lucide-react';

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

  const winner = winnerLabel(item);
  const isWinnerTeamA = item.finalWinner === 'team_a';

  return (
    <article 
      onClick={handleRowClick}
      className="group rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 cursor-pointer transition-all duration-200 hover:border-teal-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-teal-500/5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-100 text-base truncate group-hover:text-teal-400 transition-colors">
            {item.match.match_name}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {item.match.match_date}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.match.venue || 'No venue'}
            </span>
          </div>
        </div>

        {item.finalResultText && (
          <div className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-center ${isWinnerTeamA ? 'bg-teal-500/15 text-teal-400' : 'bg-blue-500/15 text-blue-400'}`}>
            {item.finalResultText}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className={`flex-1 rounded-lg border p-3 transition-all duration-200 ${isWinnerTeamA ? 'border-teal-500/30 bg-teal-500/5' : 'border-slate-600/50 bg-slate-700/30'}`}>
          <p className={`text-sm font-semibold truncate ${isWinnerTeamA ? 'text-teal-300' : 'text-slate-300'}`}>
            {item.match.team_a_name}
          </p>
          <p className={`text-xs mt-0.5 ${isWinnerTeamA ? 'text-teal-400/70' : 'text-slate-500'}`}>
            {isWinnerTeamA && <Trophy className="w-3 h-3 inline mr-1" />}
            {isWinnerTeamA ? 'Winner' : 'Team A'}
          </p>
        </div>

        <div className="shrink-0 text-center">
          <span className="text-xs font-bold text-slate-600">VS</span>
        </div>

        <div className={`flex-1 rounded-lg border p-3 transition-all duration-200 ${!isWinnerTeamA ? 'border-teal-500/30 bg-teal-500/5' : 'border-slate-600/50 bg-slate-700/30'}`}>
          <p className={`text-sm font-semibold truncate ${!isWinnerTeamA ? 'text-teal-300' : 'text-slate-300'}`}>
            {item.match.team_b_name}
          </p>
          <p className={`text-xs mt-0.5 ${!isWinnerTeamA ? 'text-teal-400/70' : 'text-slate-500'}`}>
            {!isWinnerTeamA && <Trophy className="w-3 h-3 inline mr-1" />}
            {!isWinnerTeamA ? 'Winner' : 'Team B'}
          </p>
        </div>
      </div>
    </article>
  );
}
