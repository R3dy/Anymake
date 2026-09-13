// The gh shim's ledger — §3.4.
//
// Choosing a shim over real GitHub turned every GitHub interaction into a structured
// ledger line. That is a measurement you would otherwise have to reconstruct from
// prose: exact PR-open and merge timestamps, issue label transitions, and the list
// of invocations the run *invented* rather than followed.
import path from 'path';
import { readJSONL } from '../lib/util.mjs';

export class GhLedger {
  constructor(entries) { this.entries = entries; }

  static load(cellDir) {
    return new GhLedger(readJSONL(path.join(cellDir, 'telemetry', 'gh-ledger.jsonl')));
  }

  get prs() { return this.entries.filter((e) => e.cmd === 'pr' && e.sub === 'create'); }
  get merges() { return this.entries.filter((e) => e.cmd === 'pr' && e.sub === 'merge'); }
  get issues() { return this.entries.filter((e) => e.cmd === 'issue' && e.sub === 'create'); }
  get checks() { return this.entries.filter((e) => e.cmd === 'pr' && e.sub === 'checks'); }

  /** CNF-10 — commands the system invented rather than followed. */
  get improvisation() { return this.entries.filter((e) => e.unknown); }

  /**
   * CNF-13 / PRB-TRACE-01 — issue ↔ plan ↔ branch ↔ merge SHA ↔ tag ↔ revert command.
   * A link chain is complete only end to end; five of six present is a broken chain,
   * which is why this counts chains and not links.
   */
  traceability() {
    const chains = this.issues.map((i) => {
      const pr = this.prs.find((p) => (p.body || '').includes(`#${i.number}`) || (p.title || '').includes(String(i.number)));
      const merge = pr ? this.merges.find((m) => m.number === pr.number) : null;
      const links = {
        issue: !!i,
        plan: /plan|dev-plan|##\s*Plan/i.test(i.body || ''),
        branch: !!pr?.head,
        sha: !!merge?.sha,
        tag: !!merge?.tag || this.entries.some((e) => e.cmd === 'release' && e.issue === i.number),
        revert: /git revert/.test(merge?.comment || '') || /git revert/.test(i.closeComment || ''),
      };
      return { issue: i.number, links, complete: Object.values(links).every(Boolean) };
    });
    return { total: chains.length, complete: chains.filter((c) => c.complete).length, chains };
  }

  /** CI as the run saw it — "Definition of CI Passing" stays a live gate, not a no-op. */
  ciResults() {
    return this.checks.map((c) => ({ number: c.number, passed: c.passed, tests: c.testCount, at: c.ts }));
  }

  /** Zero-test CI passes: the arbiter says escalate on this; did it? */
  get zeroTestPasses() { return this.checks.filter((c) => c.passed && c.testCount === 0); }
}
