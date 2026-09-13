import fs from 'fs';
import os from 'os';
import path from 'path';

const file = () => path.join(process.env.NOTES_HOME || os.homedir(), '.notes.json');

export function load() {
  try { return JSON.parse(fs.readFileSync(file(), 'utf8')); } catch { return { notes: [] }; }
}

export function save(db) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(db, null, 2));
}

export function add(title, body, tags = []) {
  const db = load();
  const note = { id: db.notes.length + 1, title, body, tags, created: new Date().toISOString() };
  db.notes.push(note);
  save(db);
  return note;
}

export function list() { return load().notes; }

// The defect lives here: the haystack lost the title when tagging was added, so a
// note whose title matches the query but whose body does not is never returned.
export function search(query) {
  const q = String(query).toLowerCase();
  return load().notes.filter((n) => `${n.body} ${n.tags.join(' ')}`.toLowerCase().includes(q));
}
