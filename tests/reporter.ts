import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test';
import type { Severity } from './fixtures';

type PerfCategory = 'page-load' | 'api' | 'scoring' | 'broadcast';

const PERF_BUDGET_MS: Record<PerfCategory, number> = {
  'page-load': 2500,
  api: 600,
  scoring: 1000,
  broadcast: 1500,
};

const CATEGORY_BY_LABEL: Record<string, PerfCategory | undefined> = {
  'page-load': 'page-load',
  api: 'api',
  'scoring-latency': 'scoring',
  'broadcast-update-latency': 'broadcast',
};

type TestRecord = {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  severity: Severity | null;
  bug: boolean;
  bugTitle: string;
  reproSteps: string;
  perf: { label: string; ms: number; meta: string }[];
  consoleErrors: string[];
  networkFailures: string[];
  pageErrors: string[];
  durationMs: number;
};

type Summary = {
  generatedAt: string;
  runId: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  criticalBugs: number;
  majorBugs: number;
  minorBugs: number;
  performanceScore: number;
  reliabilityScore: number;
  overallScore: number;
  performanceDetail: string[];
  reliabilityDetail: string;
  tests: TestRecord[];
};

const RUN_ID = Date.now();
const outputDir = 'test-results';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class QASummaryReporter implements Reporter {
  private results = new Map<string, TestRecord>();
  private startTime = new Date();

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.results.clear();
    this.startTime = new Date();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.retry < test.retries) return;

    const annotations = test.annotations;
    const severityAnno = annotations.find((a) => a.type === 'severity');
    const bugAnno = annotations.find((a) => a.type === 'bug');
    const bugTitleAnno = annotations.find((a) => a.type === 'bug-title');
    const reproAnno = annotations.find((a) => a.type === 'reproduction-steps');
    const perfAnno = annotations.filter((a) => a.type === 'perf');
    const consoleErrors = annotations
      .filter((a) => a.type === 'console-error')
      .map((a) => a.description ?? '');
    const networkFailures = annotations
      .filter((a) => a.type === 'network-failure')
      .map((a) => a.description ?? '');
    const pageErrors = annotations
      .filter((a) => a.type === 'page-error')
      .map((a) => a.description ?? '');

    const status =
      result.status === 'skipped' || result.status === 'interrupted'
        ? ('skipped' as const)
        : result.status === 'passed'
          ? ('passed' as const)
          : ('failed' as const);

    const severity = (severityAnno?.description as Severity | undefined) ?? null;
    const isBug = bugAnno
      ? (bugAnno.description as Severity)
      : status === 'failed' && result.status !== 'timedOut'
        ? (severity ?? 'major')
        : null;

    this.results.set(test.id(), {
      title: test.titlePath().join(' > '),
      status,
      severity: severity ?? (status === 'failed' ? 'major' : null),
      bug: Boolean(isBug),
      bugTitle: bugTitleAnno?.description ?? '',
      reproSteps: reproAnno?.description ?? '',
      perf: perfAnno.map((a) => {
        const [label, msRaw, meta] = (a.description ?? '|').split('|');
        return { label, ms: Number(msRaw) || 0, meta };
      }),
      consoleErrors,
      networkFailures,
      pageErrors,
      durationMs: result.duration,
    });
  }

  onEnd(_result: FullResult): void {
    const records = [...this.results.values()];
    const passed = records.filter((r) => r.status === 'passed').length;
    const failed = records.filter((r) => r.status === 'failed').length;
    const skipped = records.filter((r) => r.status === 'skipped').length;
    const total = records.length;

    const criticalBugs = records.filter((r) => r.bug && r.severity === 'critical').length;
    const majorBugs = records.filter((r) => r.bug && r.severity === 'major').length;
    const minorBugs = records.filter((r) => r.bug && r.severity === 'minor').length;

    const { score: performanceScore, detail: performanceDetail } = this.computePerformanceScore(records);
    const runnable = passed + failed;
    const reliabilityScore = runnable > 0 ? Math.round((passed / runnable) * 100) : 100;
    const overallScore = Math.round(0.5 * reliabilityScore + 0.5 * performanceScore);

    const summary: Summary = {
      generatedAt: new Date().toISOString(),
      runId: RUN_ID,
      total,
      passed,
      failed,
      skipped,
      criticalBugs,
      majorBugs,
      minorBugs,
      performanceScore,
      reliabilityScore,
      overallScore,
      performanceDetail,
      reliabilityDetail: `Passed ${passed}/${runnable} executed tests${skipped > 0 ? ` (${skipped} skipped)` : ''}.`,
      tests: records,
    };

    this.writeJson(summary);
    this.writeMarkdown(summary);
    this.printSummary(summary);
  }

  private computePerformanceScore(records: TestRecord[]): { score: number; detail: string[] } {
    const totals: Record<PerfCategory, { sum: number; count: number }> = {
      'page-load': { sum: 0, count: 0 },
      api: { sum: 0, count: 0 },
      scoring: { sum: 0, count: 0 },
      broadcast: { sum: 0, count: 0 },
    };

    for (const record of records) {
      for (const entry of record.perf) {
        const category = CATEGORY_BY_LABEL[entry.label];
        if (!category) continue;
        totals[category].sum += entry.ms;
        totals[category].count += 1;
      }
    }

    const detail: string[] = [];
    const categoryScores: number[] = [];
    for (const category of Object.keys(PERF_BUDGET_MS) as PerfCategory[]) {
      const t = totals[category];
      if (t.count === 0) continue;
      const avg = t.sum / t.count;
      const budget = PERF_BUDGET_MS[category];
      const score = avg > 0 ? Math.round(clamp(100 * Math.min(1, budget / avg), 0, 100)) : 100;
      categoryScores.push(score);
      detail.push(`${category}: avg ${Math.round(avg)}ms (budget ${budget}ms) -> ${score}/100`);
    }

    if (categoryScores.length === 0) {
      detail.push('No performance data recorded this run.');
      return { score: 100, detail };
    }
    const score = Math.round(categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length);
    return { score, detail };
  }

  private renderRecord(record: TestRecord): string {
    const lines: string[] = [];
    const rule = '='.repeat(78);
    lines.push(rule);
    lines.push(record.title);
    lines.push('PASS' === record.status.toUpperCase() ? `STATUS: PASS` : `STATUS: ${record.status.toUpperCase()}`);
    lines.push(`BUG: ${record.bug ? `${record.severity ?? 'major'} - ${record.bugTitle || '(no title)'}` : 'none'}`);
    lines.push(`SEVERITY: ${record.severity ?? 'none'}`);
    if (record.perf.length > 0) {
      lines.push(`PERFORMANCE: ${record.perf.map((p) => `${p.label}=${p.ms}ms`).join(', ')}`);
    }
    lines.push(`DURATION: ${Math.round(record.durationMs)}ms`);
    if (record.status === 'failed') {
      if (record.consoleErrors.length > 0) {
        lines.push(`CONSOLE ERRORS:`);
        for (const e of record.consoleErrors.slice(0, 10)) lines.push(`  - ${e}`);
      }
      if (record.networkFailures.length > 0) {
        lines.push(`NETWORK FAILURES:`);
        for (const n of record.networkFailures.slice(0, 10)) lines.push(`  - ${n}`);
      }
      if (record.pageErrors.length > 0) {
        lines.push(`PAGE ERRORS:`);
        for (const e of record.pageErrors.slice(0, 10)) lines.push(`  - ${e}`);
      }
    }
    lines.push(
      `REPRODUCTION STEPS: ${record.reproSteps || (record.status === 'passed' ? 'not applicable' : 'not provided')}`
    );
    lines.push(rule);
    return lines.join('\n');
  }

  private renderSummaryTable(summary: Summary): string {
    return [
      '',
      '='.repeat(78),
      'FINAL QA SUMMARY',
      '='.repeat(78),
      `Total tests           : ${summary.total}`,
      `Passed                : ${summary.passed}`,
      `Failed                : ${summary.failed}`,
      `Skipped               : ${summary.skipped}`,
      `Critical bugs         : ${summary.criticalBugs}`,
      `Major bugs            : ${summary.majorBugs}`,
      `Minor bugs            : ${summary.minorBugs}`,
      `Performance score     : ${summary.performanceScore}/100`,
      `Reliability score     : ${summary.reliabilityScore}/100`,
      `Overall app score     : ${summary.overallScore}/100`,
      '',
      'Performance detail:',
      ...summary.performanceDetail.map((d) => `  - ${d}`),
      `Reliability detail: ${summary.reliabilityDetail}`,
      '='.repeat(78),
      '',
    ].join('\n');
  }

  private writeJson(summary: Summary): void {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, 'qa-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  }

  private writeMarkdown(summary: Summary): void {
    mkdirSync(outputDir, { recursive: true });
    const blocks = summary.tests.map((t) => this.renderRecord(t)).join('\n');
    const md = [
      '# QA Report',
      `Generated: ${summary.generatedAt}`,
      '',
      '## Per-test results',
      '',
      '```text',
      blocks,
      '```',
      '',
      '```text',
      this.renderSummaryTable(summary),
      '```',
      '',
    ].join('\n');
    writeFileSync(join(outputDir, 'qa-summary.md'), md, 'utf8');
  }

  private printSummary(summary: Summary): void {
    const blocks = summary.tests.map((t) => this.renderRecord(t)).join('\n');
    console.log('\n' + blocks + '\n');
    console.log(this.renderSummaryTable(summary));
  }
}

export default QASummaryReporter;
