import { useSoundStore } from '../stores/soundStore';

export type SoundEffect = 'click' | 'boundary' | 'six' | 'wicket' | 'victory';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

function play(notes: { freq: number; at: number; dur: number; vol: number; type?: OscillatorType }[]) {
  const ctx = getAudioContext();
  if (!ctx) return;
  for (const n of notes) tone(ctx, n.freq, n.at, n.dur, n.vol, n.type);
}

const patterns: Record<SoundEffect, () => void> = {
  click: () => play([{ freq: 820, at: 0, dur: 0.06, vol: 0.05, type: 'triangle' }]),
  boundary: () => play([
    { freq: 520, at: 0, dur: 0.1, vol: 0.09 },
    { freq: 780, at: 0.08, dur: 0.12, vol: 0.09 },
  ]),
  six: () => play([
    { freq: 440, at: 0, dur: 0.1, vol: 0.1 },
    { freq: 660, at: 0.09, dur: 0.1, vol: 0.1 },
    { freq: 880, at: 0.18, dur: 0.18, vol: 0.11 },
  ]),
  wicket: () => play([
    { freq: 220, at: 0, dur: 0.16, vol: 0.11, type: 'sawtooth' },
    { freq: 130, at: 0.12, dur: 0.22, vol: 0.11, type: 'sawtooth' },
  ]),
  victory: () => play([
    { freq: 523, at: 0, dur: 0.14, vol: 0.1 },
    { freq: 659, at: 0.14, dur: 0.14, vol: 0.1 },
    { freq: 784, at: 0.28, dur: 0.14, vol: 0.1 },
    { freq: 1047, at: 0.42, dur: 0.3, vol: 0.11 },
  ]),
};

export function playSound(effect: SoundEffect) {
  if (useSoundStore.getState().muted) return;
  try {
    patterns[effect]();
  } catch {
    // Audio is best-effort; never break scoring on a sound failure.
  }
}
