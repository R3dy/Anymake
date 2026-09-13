# Ground truth — cli-notes@v1

Hand-written, never derived from anything a run produces. This is what makes
"did it fix the right thing" decidable rather than debatable.

## System map

| Unit | File | Responsibility |
|------|------|----------------|
| CLI entry | `bin/notes.js` | argument parsing, output formatting, exit codes |
| Store | `src/store.js` | load/save the JSON file; add, list, search |

## Requirements

1. `notes add <title> <body>` persists a note and confirms with its id and title.
2. `notes list` prints every note, one per line, with its tags.
3. `notes search <query>` matches against **title, body, and tags** — all three.
4. `notes search` with no hits prints a message and exits non-zero.
5. State lives in one JSON file under `NOTES_HOME` (or the home directory).

## Defect 1 — the one root cause

`src/store.js` → `search()` builds its haystack from `body` and `tags` only. The title
was dropped when tagging was added. **Requirement 3 is the violated one.**

A fix that adds a special case in `bin/notes.js`, or that matches the title only when
the body is empty, addresses the symptom and not the cause: `OUT-06` scores it low and
the ground truth here is why.

## Invariants

- `search()` is the single search path. The CLI must not filter notes itself.
- Every command exits 0 on success and non-zero on failure.
