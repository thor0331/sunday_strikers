import { CheckCircle2, CircleDot, Trophy } from 'lucide-react';

interface MatchTimelineProps {
  matchStatus: string;
  innings1Status?: string;
  innings2Status?: string;
  resultText?: string | null;
}

export function MatchTimeline({ matchStatus, innings1Status, innings2Status, resultText }: MatchTimelineProps) {
  const isCompleted = matchStatus === 'completed';

  if (!isCompleted) return null;

  const steps = [
    { label: 'Toss', status: 'completed' as const },
    { label: '1st Innings', status: (innings1Status === 'completed' ? 'completed' : innings1Status === 'in_progress' ? 'active' : 'pending') as 'completed' | 'active' | 'pending' },
    { label: 'Innings Break', status: innings2Status === 'completed' || innings2Status === 'in_progress' ? ('completed' as const) : (innings1Status === 'completed' ? ('active' as const) : ('pending' as const)) },
    { label: '2nd Innings', status: (innings2Status === 'completed' ? 'completed' : innings2Status === 'in_progress' ? 'active' : 'pending') as 'completed' | 'active' | 'pending' },
    { label: 'Result', status: (matchStatus === 'completed' ? 'completed' : 'pending') as 'completed' | 'active' | 'pending' }
  ];

  return (
    <div className="flex items-center justify-center gap-0 py-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${
              step.status === 'completed'
                ? 'bg-teal-100 text-teal-600'
                : step.status === 'active'
                  ? 'bg-amber-100 text-amber-600 animate-pulse'
                  : 'bg-slate-100 text-slate-300'
            }`}>
              {step.status === 'completed'
                ? <CheckCircle2 className="w-4 h-4" />
                : step.status === 'active'
                  ? <CircleDot className="w-4 h-4" />
                  : <div className="w-2 h-2 rounded-full bg-slate-300" />
              }
            </div>
            <span className={`text-[9px] font-semibold mt-1 whitespace-nowrap ${
              step.status === 'completed' ? 'text-teal-600' : step.status === 'active' ? 'text-amber-600' : 'text-slate-400'
            }`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 sm:w-12 h-0.5 mx-0.5 -mt-5 ${
              step.status === 'completed' ? 'bg-teal-300' : 'bg-slate-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function VerticalMatchTimeline({ innings1Overs, innings2Overs }: { innings1Overs?: string; innings2Overs?: string }) {
  return (
    <div className="space-y-0">
      <TimelineStep icon="📋" label="Toss" description="Coin toss completed" isFirst />
      <TimelineStep icon="🏏" label="1st Innings" description={innings1Overs ? `Played ${innings1Overs} overs` : 'Completed'} />
      <TimelineStep icon="☕" label="Innings Break" description="Teams switched sides" />
      <TimelineStep icon="🏏" label="2nd Innings" description={innings2Overs ? `Played ${innings2Overs} overs` : 'In progress'} />
      <TimelineStep icon="🏆" label="Result" description="Match completed" isLast />
    </div>
  );
}

function TimelineStep({ icon, label, description, isFirst, isLast }: { icon: string; label: string; description: string; isFirst?: boolean; isLast?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-50 border-2 border-teal-200 text-sm">
          {icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 min-h-[24px] bg-gradient-to-b from-teal-200 to-slate-100" />}
      </div>
      <div className="pb-6 pt-1">
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className="text-[11px] text-slate-400">{description}</p>
      </div>
    </div>
  );
}
