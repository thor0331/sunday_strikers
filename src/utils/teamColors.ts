export const teamColors = {
  team_a: {
    primary: '#0d9488',
    light: '#ccfbf1',
    lightBg: '#f0fdfa',
    gradient: 'from-teal-500 to-teal-600',
    gradientLight: 'from-teal-50 to-white',
    name: 'Teal',
    accent: 'teal',
    badge: 'bg-teal-100 text-teal-700',
    ring: 'ring-teal-400',
    border: 'border-teal-200',
    text: 'text-teal-600',
    textDark: 'text-teal-800',
    glow: 'glow-teal'
  },
  team_b: {
    primary: '#ea580c',
    light: '#ffedd5',
    lightBg: '#fff7ed',
    gradient: 'from-orange-500 to-orange-600',
    gradientLight: 'from-orange-50 to-white',
    name: 'Orange',
    accent: 'orange',
    badge: 'bg-orange-100 text-orange-700',
    ring: 'ring-orange-400',
    border: 'border-orange-200',
    text: 'text-orange-600',
    textDark: 'text-orange-800',
    glow: 'glow-orange'
  }
} as const;

export type TeamSide = 'team_a' | 'team_b';

export function getTeamColors(side: TeamSide | string | null | undefined) {
  if (side === 'team_a' || side === 'team_b') return teamColors[side];
  return teamColors.team_a;
}
