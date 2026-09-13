#!/usr/bin/env node
import { add, list, search } from '../src/store.js';

const [cmd, ...rest] = process.argv.slice(2);

const usage = () => {
  console.log(`notes — a tiny local note taker

  notes add <title> <body> [--tag t]   add a note
  notes list                           list every note
  notes search <query>                 find notes by title, body, or tag
  notes --help                         this message`);
};

switch (cmd) {
  case 'add': {
    const tagIdx = rest.indexOf('--tag');
    const tags = tagIdx >= 0 ? [rest[tagIdx + 1]] : [];
    const args = tagIdx >= 0 ? rest.slice(0, tagIdx) : rest;
    const [title, ...body] = args;
    if (!title) { console.error('notes add: a title is required'); process.exit(1); }
    const n = add(title, body.join(' '), tags);
    console.log(`added note ${n.id}: ${n.title}`);
    break;
  }
  case 'list': {
    const notes = list();
    if (!notes.length) { console.log('no notes yet'); break; }
    for (const n of notes) console.log(`${n.id}\t${n.title}\t${n.tags.join(',')}`);
    break;
  }
  case 'search': {
    const hits = search(rest.join(' '));
    if (!hits.length) { console.log('nothing found'); process.exit(1); }
    for (const n of hits) console.log(`${n.id}\t${n.title}`);
    break;
  }
  case '--help': case 'help': case undefined: usage(); break;
  default:
    console.error(`notes: unknown command '${cmd}'`);
    usage();
    process.exit(1);
}
