import type { Match } from '../types/models';

export async function shareMatchResult(match: Match, teamAScore: string, teamBScore: string, potmName: string | null) {
  const title = '🏏 Sunday Strikers';
  const lines = [
    `🏏 Sunday Strikers`,
    ``,
    `${match.team_a_name}: ${teamAScore}`,
    `${match.team_b_name}: ${teamBScore}`,
    ``,
    `${match.result_text || 'Match completed'}`,
  ];

  if (potmName) {
    lines.push(``, `Player of the Match: ${potmName}`);
  }

  const text = lines.join('\n');

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch {
      // User cancelled or API not available
    }
  }

  await navigator.clipboard.writeText(text);
}
