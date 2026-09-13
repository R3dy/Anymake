import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-test-'));
process.env.NOTES_HOME = home;
const { add, list, search } = await import('../src/store.js');

test('add stores a note and returns it', () => {
  const n = add('shopping', 'milk and eggs', ['home']);
  assert.equal(n.title, 'shopping');
  assert.equal(list().length, 1);
});

test('search finds a note by body', () => {
  add('dinner', 'roast chicken', []);
  assert.equal(search('chicken').length, 1);
});

test('search finds a note by tag', () => {
  assert.equal(search('home').length, 1);
});
