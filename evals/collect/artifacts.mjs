// The produced workspace, read the way a reviewer would read it.
//
// Two accessors, both used by probes and metrics: `Artifacts` for arbitrary files in
// the PROJECTS/<name>/ tree, and `Reports` for the validation and experience reports
// specifically — whose *verdicts* are evidence about the system's judgment, and
// never a score in themselves (§1 corollary).
import fs from 'fs';
import path from 'path';
import { readText, walk, exists } from '../lib/util.mjs';

export class Artifacts {
  constructor(root) { this.root = root; this._files = root && exists(root) ? walk(root) : []; }

  list() { return this._files; }
  listMatching(re) { return this._files.filter((f) => re.test(f)); }
  has(rel) { return this._files.includes(rel) || exists(path.join(this.root || '', rel)); }
  text(rel) { return this.root ? readText(path.join(this.root, rel)) : ''; }
  mtime(rel) { try { return fs.statSync(path.join(this.root, rel)).mtimeMs; } catch { return null; } }
  bytes(rel) { try { return fs.statSync(path.join(this.root, rel)).size; } catch { return 0; } }
}

const VERDICT = /VERDICT:\s*(PASS|FAIL|N\/A|BLOCKED)/i;

export class Reports {
  constructor(artifacts) { this.a = artifacts; }

  all() {
    return this.a.listMatching(/experience-report-.*\.md$/).map((f) => this._parse(f));
  }

  experience(storyId) {
    const f = this.a.listMatching(new RegExp(`experience-report-story-${escape(String(storyId))}\\.md$`))[0];
    return f ? this._parse(f) : null;
  }

  validations() {
    return this.a.listMatching(/validation-report-.*\.md$/).map((f) => {
      const body = this.a.text(f);
      return { file: f, story: storyOf(f), verdict: (VERDICT.exec(body) || [])[1]?.toUpperCase() || null, body };
    });
  }

  /** AUT-02 — Plan Reviewer rounds per issue, from review-round-K.md. */
  planReviewRounds() {
    const files = this.a.listMatching(/review-round-\d+\.md$/);
    if (!files.length) return null;
    const perIssue = new Map();
    for (const f of files) {
      const issue = (/issue-(\d+)/.exec(f) || [])[1] || path.dirname(f);
      perIssue.set(issue, Math.max(perIssue.get(issue) || 0, Number((/review-round-(\d+)/.exec(f) || [])[1] || 1)));
    }
    const rounds = [...perIssue.values()];
    return rounds.reduce((a, b) => a + b, 0) / rounds.length;
  }

  anyExperienceScenarioFor(storyId) {
    if (storyId == null) return false;
    const brief = this.a.listMatching(new RegExp(`task-brief-story-${escape(String(storyId))}\\.md$`))[0];
    if (!brief) return false;
    const body = this.a.text(brief);
    const s3a = /##\s*3a[\s\S]*?(?=\n##\s|\n*$)/i.exec(body);
    return !!s3a && !/^\s*N\/A\s*$/im.test(s3a[0].replace(/##.*\n/, ''));
  }

  parseFile(file) { return this._parse(file); }

  _parse(file) {
    const body = this.a.text(file);
    const verdict = (VERDICT.exec(body) || [])[1]?.toUpperCase().replace('N/A', 'N/A') || null;
    const steps = (body.match(/^\s*\d+\.\s+/gm) || []).length;
    const justification = /(no user-observable behavior because|LIMITATION:)/i.test(body);
    return {
      file, story: storyOf(file), verdict, steps,
      justification, justified: verdict !== 'N/A' || justification, body,
    };
  }
}

const storyOf = (f) => (/story-([\d.]+)/.exec(f) || [])[1] || null;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
