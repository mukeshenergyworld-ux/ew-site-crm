# core/ — the code that is the same in more than one app

**One place to fix.** That is the entire point.

## Working on it

```
core/ew-core.js      the shared source. EDIT HERE.
core/manifest.json   which app gets which section. Generated.
tools/make_core.py   lifts newly-shared code OUT of the apps into the core.
tools/build_core.py  writes the core INTO the apps. Run after every edit.
```

After editing `core/ew-core.js`:

```
python3 tools/build_core.py            # writes it into the apps, then proves equivalence
python3 tools/build_core.py --check    # proves only, changes nothing
```

It is idempotent — run it as often as you like.

## Why it is built in, not loaded

These apps are single self-contained files **on purpose**: they have to open in a godown
basement with no signal. A shared `<script src>` would add a request to every boot and one
new way for every app to fail at once — the opposite of what was asked for. So the core is
written *into* each app between its `EW-CORE:BEGIN` / `EW-CORE:END` markers, and what ships
is exactly as self-contained as it always was.

## The rule that makes it safe

**After a build, every function in every app must be byte-identical to what it was before.**
`tools/build_core.py` refuses to write if any function differs, is lost, is gained, or ends
up defined twice. `t_core.js` asserts the same thing from the outside.

A refactor of live apps is only worth doing if it can be *proved* to change nothing.

## What is in here, and what is not

Only functions that were already **byte-identical** in every app that had them, and that are
genuinely **top-level** — decided by brace depth, never by indentation.

Deliberately left alone: `render`, `doLogin`, `api`, `toast`, `renderLogin` and 80 others.
They share a *name* across the apps and do different jobs — between 1% and 8% alike. Merging
those would be a rewrite wearing a refactor's clothes.

**If a change belongs in only one app, it does not belong in this file.**

## Two things that were learned building it

- **`upFrom` is indented exactly like a top-level function and is defined inside
  `bottomFurniture`.** Lifting it changed its parent. Indentation is a convention; braces are
  the truth.
- **The test rigs lift code by SPAN.** Moving five journal functions into the core put them
  outside the span `rig.js` slices, so it booted a journal with parts missing and reported a
  broken app when the app was fine. The rigs now lift the named core sections they need — and
  only those, because lifting `bigbox` would shadow the stubbed device they exist to drive.
