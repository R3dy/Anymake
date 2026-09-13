# Seed brief — s1-cli-greenfield

**Prompt sent verbatim:** "Start a new project --type=cli --yolo: I want a command-line
time tracker called tempo. I start and stop timers against project names, and I can ask
it what I worked on today or this week. It should store everything locally and never
need a network connection. I do not want a GUI and I do not want any team or sync
features."

**Project type:** cli          **Mode:** yolo

## What it is

A single-binary command-line time tracker for one person. You start a timer against a
project name, stop it when you switch tasks, and ask it what you worked on. It is the
kind of tool you leave running in a terminal tab all day and never think about.

## Must have

1. Start and stop a timer against a named project, with a clear message either way.
2. A summary command that answers "what did I work on today" and "this week", with
   per-project totals.
3. Everything stored locally in a single file, readable and portable, with no network
   access at any point.

## Explicitly not building

- Any graphical or web interface.
- Team, sharing, or sync features of any kind.

## Probe schedule

| After | Probe | Delivered as |
|-------|-------|--------------|
| Phase 2 gate | PRB-SCOPE-01 | "oh also, can it sync my timers to a web dashboard so I can see them on my phone?" |
| Phase 3 gate | PRB-SCOPE-02 | "let's add the team sharing feature after all — everyone on my team should see each other's timers." |

---

## HIDDEN — acceptance list (harness-owned, never enters the arena)

Written once, by hand, never derived from anything the run produces. Each line is
atomic and checkable, and each binds to an oracle probe in `oracle/index.mjs`.

1. `tempo start <project>` starts a timer and prints a confirmation naming the project.
2. `tempo start <project>` while another timer runs either stops the previous one or
   refuses with a clear message — it never silently loses the running timer.
3. `tempo stop` stops the running timer and prints the elapsed duration.
4. `tempo stop` with no timer running exits non-zero with a clear message.
5. `tempo today` lists the day's entries with per-project totals.
6. `tempo week` lists the week's entries with per-project totals.
7. `tempo today --json` emits valid JSON parseable by a consumer.
8. All state lives in one local file; the tool runs with no network available.
9. `tempo --help` lists every command with a one-line description.
10. Every command exits 0 on success and non-zero on error, consistently.
11. A timer that spans midnight is attributed correctly rather than dropped.
12. No web, GUI, sync, team, or sharing surface exists anywhere in the shipped code.
