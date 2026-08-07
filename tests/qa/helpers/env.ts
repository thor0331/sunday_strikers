import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Loads a .env-style file (e.g. .env.local) into process.env without overriding
 * values that are already present. This is Playwright/fixture infrastructure and
 * runs in Node, so Vite's `import.meta.env.*` inlining is NOT available here.
 */
export function loadLocalEnv(file = '.env.local'): void {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/** String value of an env var, throwing a clear message if absent. */
export function envRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local or before running the QA suite.`
    );
  }
  return value;
}

export function envOptional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}