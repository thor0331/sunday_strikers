import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { envRequired } from './qa/helpers/env';

const baseURL = process.env.QA_BASE_URL ?? 'http://localhost:5173';

export type PerfEntry = { label: string; ms: number; meta?: string };

export type NetworkFailure = {
  kind: 'requestfailed' | 'http';
  url: string;
  status?: number;
  error?: string;
};

export type Severity = 'critical' | 'major' | 'minor';

export type DeclareOptions = {
  /** Flag the test as a bug report regardless of pass/fail. */
  bug?: boolean;
  severity?: Severity;
  bugTitle?: string;
  reproSteps?: string;
};

export type Qa = {
  consoleLogs: string[];
  consoleErrors: string[];
  networkFailures: NetworkFailure[];
  pageErrors: string[];
  perf: {
    entries: PerfEntry[];
    record(label: string, ms: number, meta?: string): void;
    mark(label: string): number;
    end(label: string, startedAt: number, meta?: string): void;
  };
  declare(opts: DeclareOptions): void;
  measure<T>(label: string, fn: () => Promise<T>): Promise<T>;
  timedGoto(page: Page, url: string): Promise<number>;
  assertNoConsoleErrors(): void;
  assertNoNetworkFailures(): void;
  assertNoPageErrors(): void;
  /** Declared bug metadata (internal, consumed by the fixture teardown). */
  readonly declared: { bug: boolean; severity: Severity; bugTitle: string; reproSteps: string };
};

type QaFixtures = {
  qa: Qa;
  adminStorageState: Awaited<ReturnType<BrowserContext['storageState']>>;
  adminContext: BrowserContext;
  adminPage: Page;
};

function createQa(): Qa {
  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  const networkFailures: NetworkFailure[] = [];
  const pageErrors: string[] = [];
  const perfEntries: PerfEntry[] = [];

  let declaredBug = false;
  let declaredSeverity: Severity = 'major';
  let declaredBugTitle = '';
  let declaredReproSteps = '';

  const declared = {
    get bug() {
      return declaredBug;
    },
    get severity() {
      return declaredSeverity;
    },
    get bugTitle() {
      return declaredBugTitle;
    },
    get reproSteps() {
      return declaredReproSteps;
    },
  };

  const qa: Qa = {
    consoleLogs,
    consoleErrors,
    networkFailures,
    pageErrors,
    perf: {
      entries: perfEntries,
      record(label: string, ms: number, meta?: string) {
        perfEntries.push({ label, ms, meta });
      },
      mark(label: string) {
        const t0 = performance.now();
        this.record(`${label}:start`, t0);
        return t0;
      },
      end(label: string, startedAt: number, meta?: string) {
        this.record(label, Math.round(performance.now() - startedAt), meta);
      },
    },
    declare(opts: DeclareOptions) {
      if (opts.bug !== undefined) declaredBug = opts.bug;
      if (opts.severity) declaredSeverity = opts.severity;
      if (opts.bugTitle) declaredBugTitle = opts.bugTitle;
      if (opts.reproSteps) declaredReproSteps = opts.reproSteps;
    },
    get declared() {
      return declared;
    },
    async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const t0 = performance.now();
      const result = await fn();
      qa.perf.record(label, Math.round(performance.now() - t0));
      return result;
    },
    async timedGoto(page: Page, url: string): Promise<number> {
      const t0 = performance.now();
      await page.goto(url, { waitUntil: 'load' });
      try {
        await page.waitForLoadState('networkidle');
      } catch {
        // networkidle can time out on long-polling apps; wall-clock is still valid
      }
      const ms = Math.round(performance.now() - t0);
      qa.perf.record('page-load', ms, url);
      return ms;
    },
    assertNoConsoleErrors() {
      expect(qa.consoleErrors, `Unexpected console errors: ${qa.consoleErrors.join(' | ')}`).toEqual([]);
    },
    assertNoNetworkFailures() {
      expect(qa.networkFailures, `Network failures: ${JSON.stringify(qa.networkFailures)}`).toEqual([]);
    },
    assertNoPageErrors() {
      expect(qa.pageErrors, `Page errors: ${qa.pageErrors.join(' | ')}`).toEqual([]);
    },
  };

  return qa;
}

function describeNetworkFailure(f: NetworkFailure): string {
  if (f.kind === 'http') return `[HTTP ${f.status}] ${f.url}`;
  return `[FAILED] ${f.url} (${f.error ?? 'unknown'})`;
}

function attachCapture(page: Page, qa: Qa): void {
  page.on('console', (msg) => {
    qa.consoleLogs.push(msg.text());
    if (msg.type() === 'error' || msg.type() === 'warning') {
      qa.consoleErrors.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    qa.pageErrors.push(err.message);
  });
  page.on('requestfailed', (req) => {
    qa.networkFailures.push({
      kind: 'requestfailed',
      url: req.url(),
      error: req.failure()?.errorText,
    });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      qa.networkFailures.push({ kind: 'http', status: res.status(), url: res.url() });
    }
  });
}

export const test = base.extend<QaFixtures>({
  qa: async ({}, use, testInfo) => {
    const qa = createQa();
    await use(qa);

    // ---- teardown: push structured data to the reporter via annotations ----
    for (const line of qa.consoleErrors) {
      testInfo.annotations.push({ type: 'console-error', description: line });
    }
    for (const failure of qa.networkFailures) {
      testInfo.annotations.push({ type: 'network-failure', description: describeNetworkFailure(failure) });
    }
    for (const err of qa.pageErrors) {
      testInfo.annotations.push({ type: 'page-error', description: err });
    }
    for (const entry of qa.perf.entries) {
      testInfo.annotations.push({
        type: 'perf',
        description: `${entry.label}|${entry.ms}|${entry.meta ?? ''}`,
      });
    }
    if (qa.declared.bug) {
      testInfo.annotations.push({ type: 'bug', description: qa.declared.severity });
      if (qa.declared.bugTitle) {
        testInfo.annotations.push({ type: 'bug-title', description: qa.declared.bugTitle });
      }
    }
    if (qa.declared.reproSteps) {
      testInfo.annotations.push({ type: 'reproduction-steps', description: qa.declared.reproSteps });
    }
    if (qa.declared.severity) {
      testInfo.annotations.push({ type: 'severity', description: qa.declared.severity });
    }
  },

  adminStorageState: [
    async ({ browser }, use) => {
      const email = envRequired('ADMIN_EMAIL');
      const password = envRequired('ADMIN_PASSWORD');

      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      try {
        await page.goto('/admin/login');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Password').fill(password);
        await page.getByRole('button', { name: 'Login' }).click();
        await page.waitForURL('**/admin');
      } catch (error) {
        await context.close();
        throw new Error(
          `[auth] Admin login failed for ${email}. Check ADMIN_EMAIL/ADMIN_PASSWORD and app availability at ${baseURL}. Cause: ${String(error)}`
        );
      }
      const state = await context.storageState();
      await context.close();
      await use(state);
    },
    { scope: 'worker' },
  ],

  adminContext: async ({ browser, adminStorageState }, use) => {
    const context = await browser.newContext({ baseURL, storageState: adminStorageState });
    await use(context);
    await context.close();
  },

  adminPage: async ({ adminContext, qa }, use) => {
    const page = await adminContext.newPage();
    attachCapture(page, qa);
    await use(page);
  },
});

export { expect };

/** Re-export for specs that need a plain, unauthenticated page. */
export const plainTest = base.extend<{ qa: Qa }>({
  qa: async ({}, use, testInfo) => {
    const qa = createQa();
    await use(qa);
    for (const line of qa.consoleErrors) {
      testInfo.annotations.push({ type: 'console-error', description: line });
    }
    for (const failure of qa.networkFailures) {
      testInfo.annotations.push({ type: 'network-failure', description: describeNetworkFailure(failure) });
    }
    for (const err of qa.pageErrors) {
      testInfo.annotations.push({ type: 'page-error', description: err });
    }
    for (const entry of qa.perf.entries) {
      testInfo.annotations.push({
        type: 'perf',
        description: `${entry.label}|${entry.ms}|${entry.meta ?? ''}`,
      });
    }
    if (qa.declared.bug) {
      testInfo.annotations.push({ type: 'bug', description: qa.declared.severity });
      if (qa.declared.bugTitle) {
        testInfo.annotations.push({ type: 'bug-title', description: qa.declared.bugTitle });
      }
    }
    if (qa.declared.reproSteps) {
      testInfo.annotations.push({ type: 'reproduction-steps', description: qa.declared.reproSteps });
    }
    if (qa.declared.severity) {
      testInfo.annotations.push({ type: 'severity', description: qa.declared.severity });
    }
  },
});
