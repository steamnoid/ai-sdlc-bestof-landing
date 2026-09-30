# The page for [`ai-sdlc-bestof`](https://github.com/steamnoid/ai-sdlc-bestof)

**Live:** <https://steamnoid.github.io/ai-sdlc-bestof-landing>

A landing page for a project that lives somewhere else. That is the whole idea, and it is
not a formality — see below.

## The page is a view, not a description

Every fact about `ai-sdlc-bestof` on that page is read out of `ai-sdlc-bestof` by a program
that runs in the build. The stages, the roles and the table of legal moves are **imported
from the code**. The suite is **run in the build** and its terminal block is the runner's own
bytes. The glossary is **read under the rules it states about being read** — which is a
section of that file, in a table, saying which cells are names and which hold words that are
not.

And then there are the three the project publishes about itself, which a page is the only
reader of:

| the project says | the page checks |
|---|---|
| a refusal is `built` or `not yet` | whether a name of that shape is **declared anywhere under `src/`** |
| a rule is held in a named file | whether **that file exists** |
| the glossary's stage table and the enumeration | whether they **name the same stages**, and whether they are in the same order |

All three currently hold — and the second one has a three-valued answer, because a rule held
by `ruff` is held and a rule naming a file that is not there is not, and a boolean has two
states and this has three.

**The check is deliberately weaker than the project's own, and the page says so.** The
project holds itself to those tables with a suite somebody has to install and run; the page
asks whether a name is *declared*, which is a refusal declared and never raised. That gap is
the defect the project was built after, so a page claiming the stronger check by silence would
overstate what it knows by exactly the amount the project cares about.

The page is rebuilt on a schedule and on every push, and **publishes only when a fact on it
changed**. It publishes the state it was built from, so every number on it can be checked
against the file it came from — and it says **when** it read the project beside every claim,
because GitHub's schedule is best-effort and promises nothing.

## Why, when the obvious thing is to type it

The page about a sibling project was written by hand. Within a fortnight it was listing a
sixth role the project had deleted, on the grounds that a handoff is not a discipline, plus a
number of specialists that no longer existed and a phase table that had moved on. It looked
perfectly correct the whole time. Nothing had failed; the page had simply never been checked
against anything.

So the three things a hand-written page gets wrong are the three things here, and each has a
test:

- **A suite that was never run is not a suite that passed**, and not one that failed either —
  it is a third thing, and it says which flag would run it.
- **A repository with no CI is not a repository whose checks passed**, and a check-run count
  that could not be read is not a count of zero.
- **A call that could not be made leaves a field unread, not "no".** Rate limits and revoked
  tokens shorten the page instead of breaking it.

The suite is green only when it exited zero. A run that printed `1 failed, 449 passed` is a
run that failed, and the exit code is the only fact that settles it.

## Working here

```bash
npm ci                # the lockfile is committed, and `npm ci` needs it
npm test              # 149 tests, no network, and a build of the page
npm run collect       # read the project, run its suite, write src/state/
npm run build         # the page, from the state
npm run gate          # all of the above, in that order, stopping at the first refusal

# read a checkout you are working in — the developer's own loop
npm run collect

# read the branch as everybody else sees it, which is what the page is about
npm run collect:published
```

`src/state/the_bestof.json` is **never committed**: a committed snapshot is a number nobody
checked. The sibling page published last month's test count for exactly that reason, and
every step of that build reported success while it happened.

## How it is put together

```text
scripts/ask_a_python_reader.mjs    runs a Python reader on the checkout's own interpreter
scripts/ask_the_layers.py           imports the package and reads the layers it declares
scripts/ask_the_code.py             imports Stage, Role and the table of legal moves
scripts/read_the_layers_on_disk.mjs counts what is in each layer's directory
scripts/read_what_the_project_holds.mjs   counts what git holds, and a working tree is not a branch
scripts/read_the_glossary.mjs       six tables, read by the rules the file states about itself
scripts/read_where_it_came_from.mjs the five projects, by position — that table's first column has no heading
scripts/read_where_a_name_is_declared.mjs a declaration, and not a mention of the name
scripts/read_the_documentation.mjs  manifest, rules table, workflows, commands, licence
scripts/read_the_suite.mjs          runs it; green is the exit code
scripts/read_the_git_history.mjs    a directory inside a checkout is not a checkout
scripts/read_github.mjs             no call throws, and a rate limit shortens the page
scripts/ask_the_repository.mjs      the collector: one state, written once, or not at all
scripts/compare_the_states.mjs      what differs, and what is only about the run
scripts/has_anything_changed.mjs    asks the live page, because it is the previous state
scripts/check_out_the_project.mjs   the clone, whole — a shallow one reports one commit
scripts/keep_the_schedule_alive.mjs one empty commit, when the silence is long enough
src/page/what_the_page_says.mjs     the only place a number becomes a claim
src/page/what_the_glossary_says.mjs three verdicts, and not one of them refuses
src/page/what_the_built_column_says.mjs   two disagreements, never sharing a sentence
src/pages/index.astro               layout, and not one number
src/state/the_bestof.json          the only bridge — a build artifact, never committed
```

`AGENTS.md` has the rules, the reason each one exists, and the things not to do.

## Licence

MIT for this repository. The project the page is about is under its own licence, and the page
prints **that** file's first line rather than recognising it — `All Rights Reserved` is a
real licence and a reader that recognised it as permissive would report a project as open
source when it is not.
