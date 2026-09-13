// The repro suite: RED on the frozen fixture, GREEN only when the defect is fixed.
// Written against the store's public API, so a CLI-level workaround does not satisfy it.
import { test } from 'node:test';
import assert from 'node:assert';
import path from 'path';

const { add, search } = await import(path.join(process.env.NOTES_UNDER_TEST, 'src', 'store.js'));

test('search matches a note by its title', () => {
  add('groceries', 'milk and eggs', []);
  const hits = search('groceries');
  assert.equal(hits.length, 1, 'a note whose title matches the query must be returned');
  assert.equal(hits[0].title, 'groceries');
});

test('search still matches body and tags', () => {
  add('dinner', 'roast chicken', ['food']);
  assert.equal(search('chicken').length, 1);
  assert.equal(search('food').length, 1);
});
