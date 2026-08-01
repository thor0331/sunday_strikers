import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

type GlowColor = 'green' | 'blue' | 'red' | 'yellow' | 'none';

interface GlassCardProps {
  children: ReactNode;
  glow?: GlowColor;
  hover?: boolean;
  premium?: boolean;
  className?: string;
}

const glowStyles: Record<GlowColor, string> = {
  green: 'glow-green',
  blue: 'glow-blue',
  red: 'glow-red',
  yellow: 'glow-yellow',
  none: ''
};

export function GlassCard({ children, glow = 'none', hover = false, premium = false, className = '' }: GlassCardProps) {
  return (
    <motion.div
      className={`rounded-[18px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl ${premium ? 'card-premium' : ''} ${glowStyles[glow]} ${hover ? 'hover-lift' : ''} ${className}`}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}
