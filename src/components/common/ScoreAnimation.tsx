import { useEffect, useState, useCallback } from 'react';

interface ScoreEvent {
  id: number;
  type: 'runs' | 'wicket';
  value: string;
}

let eventId = 0;
const listeners = new Set<(event: ScoreEvent) => void>();

export function emitScoreEvent(type: 'runs' | 'wicket', value: string) {
  const event: ScoreEvent = { id: ++eventId, type, value };
  listeners.forEach(fn => fn(event));
}

export function ScoreAnimation() {
  const [events, setEvents] = useState<ScoreEvent[]>([]);

  const addEvent = useCallback((event: ScoreEvent) => {
    setEvents(prev => [...prev, event]);
  }, []);

  useEffect(() => {
    listeners.add(addEvent);
    return () => { listeners.delete(addEvent); };
  }, [addEvent]);

  const removeEvent = (id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {events.map(event => (
        <div
          key={event.id}
          onAnimationEnd={() => removeEvent(event.id)}
          className={event.type === 'wicket' ? 'animate-wicket-impact' : 'animate-score-pop'}
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: event.type === 'wicket' ? '2.5rem' : '2rem',
            fontWeight: 900,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            textShadow: event.type === 'wicket'
              ? '0 0 20px rgba(239, 68, 68, 0.6), 0 0 60px rgba(239, 68, 68, 0.3)'
              : '0 0 20px rgba(20, 184, 166, 0.5)',
            color: event.type === 'wicket' ? '#ef4444' : '#0d9488',
            letterSpacing: '0.05em'
          }}
        >
          {event.value}
        </div>
      ))}
    </div>
  );
}
