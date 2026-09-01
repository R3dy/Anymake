// Validate a board-state.json against TEMPLATES/board-state.schema.json.
//
// Zero dependencies, no build step, no runtime service — the same shape as
// verify-plugin.mjs, and for the same reason (ADR-008: markdown-as-source-of-
// truth). This is a check an agent is instructed to run after writing the
// board, not a background process watching it.
//
// Usage:
//   node .opencode/validate-board-state.mjs <path/to/board-state.json>
//   node .opencode/validate-board-state.mjs --expect-fail <path>   # for CI fixtures
//
// Exit 0 = valid, 1 = invalid (inverted under --expect-fail).
//
// A schema failure is treated exactly like a failed dispatch output_check:
// do not proceed on it. See skills/anymake-dispatch/SKILL.md.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT, 'TEMPLATES', 'board-state.schema.json');

const args = process.argv.slice(2);
const expectFail = args.includes('--expect-fail');
const target = args.find((a) => !a.startsWith('--'));

if (!target) {
  console.error('usage: node .opencode/validate-board-state.mjs [--expect-fail] <board-state.json>');
  process.exit(2);
}

const errors = [];
const err = (instancePath, message) => errors.push(`${instancePath || '/'}: ${message}`);

// A deliberately small draft-07 subset — exactly the keywords this schema uses.
// Adding a keyword to the schema means adding it here; an unknown keyword is
// silently ignored, so keep the two in step.
function validate(data, schema, at = '') {
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual =
      data === null ? 'null'
      : Array.isArray(data) ? 'array'
      : Number.isInteger(data) ? 'integer'
      : typeof data === 'number' ? 'number'
      : typeof data;
    // An integer satisfies "number"; nothing else is coerced.
    const okType = types.some((t) => t === actual || (t === 'number' && actual === 'integer'));
    if (!okType) {
      err(at, `expected type ${types.join('|')}, got ${actual}`);
      return; // further keywords are meaningless against the wrong type
    }
  }

  if (schema.enum && !schema.enum.includes(data)) {
    err(at, `value ${JSON.stringify(data)} is not one of: ${schema.enum.join(', ')}`);
  }

  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      err(at, `${data} is below the minimum of ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      err(at, `${data} exceeds the maximum of ${schema.maximum}`);
    }
  }

  if (typeof data === 'string' && schema.format === 'date-time') {
    // ISO-8601 with an explicit zone. The orchestrator reconciles on these
    // timestamps (stall detection), so a naive local time is a real defect.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(data)) {
      err(at, `"${data}" is not an ISO-8601 date-time with a timezone`);
    }
  }

  if (Array.isArray(data) && schema.items) {
    data.forEach((item, i) => validate(item, schema.items, `${at}/${i}`));
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of schema.required || []) {
      if (!(key in data)) err(at, `missing required property "${key}"`);
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (key in data) validate(data[key], sub, `${at}/${key}`);
    }
  }
}

let schema;
let instance;
try {
  schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
} catch (e) {
  console.error(`Cannot read schema at ${SCHEMA_PATH}: ${e.message}`);
  process.exit(2);
}
try {
  instance = JSON.parse(fs.readFileSync(target, 'utf8'));
} catch (e) {
  err('', `not readable as JSON: ${e.message}`);
}

if (instance !== undefined) {
  validate(instance, schema);

  // Cross-field consistency the JSON Schema subset cannot express.
  if (instance && typeof instance === 'object') {
    const stories = Array.isArray(instance.stories) ? instance.stories : [];
    const inFlight = Array.isArray(instance.in_flight) ? instance.in_flight : [];
    const ids = new Set(stories.map((s) => s && s.id));

    for (const id of inFlight) {
      if (!ids.has(id)) err('/in_flight', `references story "${id}", which is not in stories[]`);
    }
    const IN_FLIGHT_STATUSES = ['in_progress', 'in_validation', 'experience'];
    for (const s of stories) {
      if (!s || typeof s !== 'object') continue;
      const shouldBeInFlight = IN_FLIGHT_STATUSES.includes(s.status);
      const listed = inFlight.includes(s.id);
      if (shouldBeInFlight && !listed) {
        err('/in_flight', `story "${s.id}" has status "${s.status}" but is not listed in in_flight`);
      }
      if (!shouldBeInFlight && listed) {
        err('/in_flight', `story "${s.id}" has status "${s.status}" but is listed in in_flight`);
      }
      for (const dep of s.depends_on || []) {
        if (!ids.has(dep)) err(`/stories/${s.id}/depends_on`, `references unknown story "${dep}"`);
      }
    }
    const seen = new Set();
    for (const s of stories) {
      if (!s || s.id === undefined) continue;
      if (seen.has(s.id)) err('/stories', `duplicate story id "${s.id}"`);
      seen.add(s.id);
    }
    if (instance.concurrency && typeof instance.concurrency.current === 'number' &&
        instance.concurrency.current !== inFlight.length) {
      err('/concurrency/current',
        `is ${instance.concurrency.current} but in_flight has ${inFlight.length} entr${inFlight.length === 1 ? 'y' : 'ies'} — the orchestrator must set them together`);
    }
    if (instance.concurrency && typeof instance.concurrency.max === 'number' &&
        inFlight.length > instance.concurrency.max) {
      err('/in_flight', `${inFlight.length} stories in flight exceeds concurrency.max of ${instance.concurrency.max}`);
    }
  }
}

const valid = errors.length === 0;
const rel = path.relative(process.cwd(), target) || target;

if (valid) {
  console.log(`VALID    ${rel}`);
} else {
  console.log(`INVALID  ${rel}`);
  for (const e of errors) console.log(`  - ${e}`);
}

if (expectFail) {
  if (valid) {
    console.log('\nEXPECTED FAILURE, GOT VALID — the fixture no longer exercises the schema constraints it exists to test.');
    process.exit(1);
  }
  console.log(`\nExpected-fail fixture rejected as intended (${errors.length} error(s)).`);
  process.exit(0);
}
process.exit(valid ? 0 : 1);
