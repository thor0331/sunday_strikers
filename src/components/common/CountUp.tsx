import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
}

export function CountUp({ value, duration = 700, decimals = 0, className }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const previousRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = previousRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        previousRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return <span className={className}>{formatted}</span>;
}
