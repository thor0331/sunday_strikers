import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { GlassCard } from './GlassCard';
import type { Match } from '../../types/models';

function getTimeRemaining(dateStr: string) {
  const matchDate = new Date(dateStr);
  const now = new Date();
  const diff = matchDate.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    expired: false,
  };
}

function Countdown({ dateStr }: { dateStr: string }) {
  const [time, setTime] = useState(() => getTimeRemaining(dateStr));

  useEffect(() => {
    const timer = setInterval(() => setTime(getTimeRemaining(dateStr)), 60000);
    return () => clearInterval(timer);
  }, [dateStr]);

  if (time.expired) return <span className="text-xs text-slate-500 font-medium">Starting soon</span>;

  return (
    <div className="flex gap-2 text-center justify-center">
      {time.days > 0 && (
        <div className="glass rounded-xl px-3 py-1.5 min-w-[3.5rem]">
          <p className="text-sm font-extrabold text-teal-600 tabular-nums">{time.days}</p>
          <p className="text-[9px] text-teal-500 uppercase font-bold">Days</p>
        </div>
      )}
      <div className="glass rounded-xl px-3 py-1.5 min-w-[3.5rem]">
        <p className="text-sm font-extrabold text-teal-600 tabular-nums">{time.hours}</p>
        <p className="text-[9px] text-teal-500 uppercase font-bold">Hrs</p>
      </div>
      <div className="glass rounded-xl px-3 py-1.5 min-w-[3.5rem]">
        <p className="text-sm font-extrabold text-teal-600 tabular-nums">{time.minutes}</p>
        <p className="text-[9px] text-teal-500 uppercase font-bold">Min</p>
      </div>
    </div>
  );
}

export function UpcomingMatchWidget({ match }: { match: Match }) {
  return (
    <Link to={`/matches/${match.id}`} className="block">
      <GlassCard variant="light" hover className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Next Match
          </span>
          <Calendar className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 text-center">
            <p className="text-sm font-extrabold text-slate-800">{match.team_a_name}</p>
          </div>
          <div className="text-xs font-bold text-slate-300 px-2 bg-slate-50 rounded-full px-3 py-1">VS</div>
          <div className="flex-1 text-center">
            <p className="text-sm font-extrabold text-slate-800">{match.team_b_name}</p>
          </div>
        </div>
        <div className="space-y-1.5 text-xs text-slate-500 text-center">
          <p className="inline-flex items-center gap-1 justify-center">
            <Calendar className="w-3 h-3" /> {match.match_date}
          </p>
          {match.venue && (
            <p className="inline-flex items-center gap-1 justify-center">
              <MapPin className="w-3 h-3" /> {match.venue}
            </p>
          )}
        </div>
        <div className="mt-3 flex justify-center">
          <Countdown dateStr={match.match_date} />
        </div>
      </GlassCard>
    </Link>
  );
}
