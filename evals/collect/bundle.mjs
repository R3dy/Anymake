// The collected bundle — everything one cell produced, assembled once and handed to
// the probes (§4.2), the metrics (§5) and the diagnostics (§7).
//
// Collection happens after teardown and reads only what was persisted, so `--score`
// can rebuild a bundle from an archived run without re-running any agents (§9.3).
import fs from 'fs';
import path from 'path';
import { readJSON, readJSONL, readText, writeJSON, exists } from '../lib/util.mjs';
import { Trace } from './trace.mjs';
import { Board, findProjectDir } from './board.mjs';
import { Git } from './git.mjs';
import { GhLedger } from './ghledger.mjs';
import { Artifacts, Reports } from './artifacts.mjs';
import { scanTree, boardAgreement, artifactCompleteness } from './scans.mjs';
import { runOracle, trustGap, experienceGateIntegrity } from './oracle.mjs';

export async function collect({ cellDir, arenaDir, scenario, fixture, profile, ctx }) {
  const tel = path.join(cellDir, 'telemetry');
  const trace = Trace.load(cellDir);
  const board = Board.load(cellDir, arenaDir);
  const git = Git.load(arenaDir, cellDir);
  const gh = GhLedger.load(cellDir);

  const projectDir = findProjectDir(arenaDir) || archivedProjectDir(cellDir) || path.join(cellDir, 'artifacts');
  const artifacts = new Artifacts(exists(projectDir) ? projectDir : null);
  const reports = new Reports(artifacts);
  const productRepo = exists(path.join(arenaDir, 'project-repo.git')) ? path.join(arenaDir, 'project-repo.git') : null;

  // §9.3: telemetry and artifacts are always kept, because re-scoring an old run must
  // never require re-running it. The oracle ran against a tree that no longer exists by
  // then, so its verdict is archived the first time and replayed afterwards.
  const oracleCache = path.join(tel, 'oracle.json');
  let oracle;
  if (productRepo || exists(path.join(arenaDir, 'mission-control'))) {
    oracle = await runOracle({
      oracleDir: fixture?.oracleDir || scenario?.oracleDir,
      productRepo, projectDir, arenaDir, fixture, scenario,
    });
    writeJSON(oracleCache, oracle);
  } else {
    oracle = readJSON(oracleCache, { available: false, note: 'arena released and no archived oracle result — Outcome metrics unscored' });
  }

  const scans = scanTree(exists(projectDir) ? projectDir : cellDir);
  const responder = {
    turns: readJSONL(path.join(tel, 'responder.jsonl')),
    get scripted() { return this.turns.filter((t) => t.source === 'script'); },
    get unscripted() { return this.turns.filter((t) => t.source === 'persona'); },
    get injections() { return this.turns.filter((t) => t.probe); },
  };
  const runner = readJSON(path.join(tel, 'runner.json'), {});
  const transcript = readJSONL(path.join(tel, 'transcript.jsonl'));

  const gate = experienceGateIntegrity(reports, oracle);

  return {
    cellDir, arenaDir, ctx, scenario, fixture, profile,
    trace, board, git, gh, artifacts, reports, scans, responder, runner, transcript, oracle,
    derived: {
      trustGap: trustGap(board.doneStories, oracle),
      gateIntegrity: gate.integrity,
      waiverAbuse: gate.abuse,
      boardAgreement: boardAgreement(board.boardMd, board.final),
      artifactCompleteness: artifactCompleteness(projectDir, profile?.requiredArtifacts || []),
      schemaValidity: await board.schemaValidity(),
    },
  };
}

/** cells/<id>/artifacts/<project>/ — what archiveArtifacts() copied out of the arena. */
function archivedProjectDir(cellDir) {
  const base = path.join(cellDir, 'artifacts');
  if (!exists(base)) return null;
  const dirs = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory());
  return dirs.length ? path.join(base, dirs[0].name) : null;
}

export { readText };
