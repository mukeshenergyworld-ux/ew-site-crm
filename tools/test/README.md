# tools/test

Run everything before an upload:

    sh tools/test/run.sh

**The rule this folder exists to enforce: never re-implement the logic in a test.**
`harness.js` lifts the real function out of the shipped file by brace matching and runs
*that*, with stubs for whatever the test does not care about. A missing name is reported,
never silently shimmed — a stub that hides a real dependency is how a green test lies.

Two tests written in this repo were wrong in exactly that way and both shipped:

* **6.9.972** drove `rtTryLine` on its own and passed while the Finalise card that calls it
  threw before it could draw. He found it, not the test.
* **6.9.980** drove the merge helper rather than the caller, and the same product came out
  on two lines.

A helper correct on its own says **nothing** about the screen that calls it.

## What is here

| file | what it proves |
|---|---|
| `harness.js` | the lifter, plus `ok` / `eq` / `done` |
| `t_money_agrees.js` | the shared money rules read identically in all three apps, each defined exactly once, and which rules are still apart |
| `run.sh` | the core build's own proof, then every file parses, then the money check |

## `book.json` — not in the repo, on purpose

Some tests want real rows. Export the Google Sheet, convert the tabs you need to
`{ "challans": [...], "clients": [...], "discounts": [...] }` and save it as
`tools/test/book.json`. **It is not committed**: it carries client names, mobiles and
money, and this repository is public. `harness.book()` reads it and says so plainly when
it is not there.
