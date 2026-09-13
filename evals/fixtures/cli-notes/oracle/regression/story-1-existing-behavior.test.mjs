// The regression suite: green on the frozen fixture, and it must STAY green.
// This is what catches "fixed the bug, broke the app".
import { test } from 'node:test';
import assert from 'node:assert';
import path from 'path';

const { add, list, search } = await import(path.join(process.env.NOTES_UNDER_TEST, 'src', 'store.js'));

test('add persists a note', () => {
  const n = add('shopping', 'milk and eggs', ['home']);
  assert.equal(n.title, 'shopping');
  assert.equal(list().length, 1);
});

test('search does not return unrelated notes', () => {
  add('dinner', 'roast chicken', []);
  assert.equal(search('bicycle').length, 0);
});

test('list returns every note in insertion order', () => {
  const notes = list();
  assert.deepEqual(notes.map((n) => n.title), ['shopping', 'dinner']);
});
