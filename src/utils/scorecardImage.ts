export interface ScorecardTeam {
  name: string;
  runs: number;
  wickets: number;
  overs: string;
}

export interface ScorecardData {
  matchName: string;
  date: string;
  venue: string;
  resultText: string;
  teams: ScorecardTeam[];
  potmName?: string;
}

const BG_TOP = '#0a1420';
const BG_BOTTOM = '#07111F';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function downloadScorecardPNG(data: ScorecardData, filename = 'scorecard.png') {
  const W = 1080;
  const H = 1350;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle orb glow
  const orb = ctx.createRadialGradient(W - 180, 120, 10, W - 180, 120, 420);
  orb.addColorStop(0, 'rgba(20,184,166,0.16)');
  orb.addColorStop(1, 'rgba(20,184,166,0)');
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#34d399';
  ctx.font = '700 34px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('SUNDAY STRIKERS', W / 2, 110);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 46px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(data.matchName, W / 2, 190);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 26px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(`${data.date}${data.venue ? `  •  ${data.venue}` : ''}`, W / 2, 238);

  // Divider
  const divider = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
  divider.addColorStop(0, 'rgba(255,255,255,0)');
  divider.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  divider.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = divider;
  ctx.fillRect(W / 2 - 160, 280, 320, 2);

  // Teams
  const cardX = 90;
  const cardW = W - 180;
  const rowH = 108;
  let y = 340;

  for (let i = 0; i < data.teams.length; i++) {
    const team = data.teams[i];
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, cardX, y, cardW, rowH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 30px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(team.name, cardX + 40, y + 42);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 22px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`${team.overs} ov`, cardX + 40, y + 78);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 40px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`${team.runs}/${team.wickets}`, cardX + cardW - 40, y + 72);

    y += rowH + 20;
  }

  // Result
  const resY = y + 26;
  ctx.fillStyle = 'rgba(34,197,94,0.10)';
  roundRect(ctx, cardX, resY, cardW, 92, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34,197,94,0.35)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4ade80';
  ctx.font = '700 30px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(data.resultText, W / 2, resY + 55);

  y = resY + 128;

  if (data.potmName) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, cardX, y, cardW, 88, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,0.3)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 24px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('PLAYER OF THE MATCH', W / 2, y + 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 32px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(data.potmName, W / 2, y + 72);

    y += 108;
  }

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '600 22px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Made with Sunday Strikers', W / 2, H - 60);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}
