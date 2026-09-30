# AGENTS.md — how to work in *this* repository

This repository is a **view**. The page it builds is about
[`steamnoid/ai-sdlc-bestof`](https://github.com/steamnoid/ai-sdlc-bestof), which lives
somewhere else, and every fact on that page is read out of that project by a program running
in the build. Nothing about the project is written here.

The three rules it was learned from — strict TDD, readability, and the code mirroring the
domain — live in that project's own `AGENTS.md` and are deliberately not restated. What
follows is what is *local* to a repository whose job is to describe another one.

---

## The one rule

> **A fact is generated, or it is not on the page.**
>
> **A document that is not published is named as not published.**

The first is inherited. The second exists because this page reads documents: a glossary, a
rules table, a manifest, a licence, a README. A project that publishes none of them is
ordinary — especially this one, which began as a domain and a table of legal moves. So every
reader here keeps one pair of shapes apart:

| what happened | what the reader answers | what the page draws |
|---|---|---|
| the project does not have it | `was_read: false` **and a sentence saying why** | an amber block, in words |
| the project has it and this page could not read it | a **refusal by name** | the build stops, nothing on disk |
| this page was never asked | `null`, and the flag that would ask | "unread", and never "no" |

**The three are never merged.** A project that publishes no rules table is a project with no
rules table; a table that has been reorganised is a fault in the reader. A repository with no
continuous integration is a fact, and a check-run count that could not be read is not.

---

## What is generated, and from where

| On the page | Read from |
|---|---|
| the stages, the roles, the table of legal moves | the project's own objects, **imported** — never a document about them |
| which stage an agent must be holding | the project, and **which of three conventions** answered, printed beside the column |
| the layers, in three columns | the package's docstring · the tree on disk · **what git holds** |
| the glossary | the file itself, **read under the rules it states about being read** |
| which of the project's own refusals exist | the `Built` column, **checked against the source tree** |
| which test file holds each of the project's rules | the rules table, **checked against the tree** |
| the suite and its verdict | **run in the build**, printed byte for byte, green ⇔ exit code 0 |
| the history and the RED/GREEN pairing | `git log`, and the directory checked because a subdirectory answers with its parent |
| the project's description and check runs | GitHub's own API, and no call throws |
| the licence | the `LICENSE` file's first line, **never recognised** |
| the five projects it was learned from | the document that records them, read by position because that table's first column has no heading |

## What is written by hand, and why that is allowed

The pitch, the section headings, the claims about why the work matters, and who to write to.
**No test in another repository could refute a sentence about why the work matters, so
generating it would be theatre.** A fact can be refuted, and those are the ones that get read.

---

## The three shapes a page gets wrong

Each is decided in `src/page/`, and each is caught by a test that builds the real page and
reads it back.

| it looks like | which is not | decided in |
|---|---|---|
| green | a suite that printed a lot of passes | `what_the_suite_says` |
| not run | a suite that failed | same — the third thing, and it names the flag |
| a layer | a directory somebody made and has not filled | `what_the_layers_say` |
| a rule held by a file | a rule held by lint | `what_the_rules_say` — `null` and not `false` |
| an absence | a refusal | every reader, and the pair is in each one's header |
| a claim the tree refutes | a claim the tree understates | `what_the_built_column_says` — **never one sentence for both** |

---

## Working here

```bash
npm ci                # the lockfile is committed, and `npm ci` needs it
npm test              # every test, no network, and a build of the page
npm run collect       # read the project, run its suite, write src/state/
npm run build         # the page, from the state
./scripts/gate        # test → collect → build → test:page, stopping at the first refusal
```

- **The default run reaches no network.** GitHub is asked only when `--github-api` is named,
  and the page then says which fields it could not read. A build that cannot be run offline
  cannot be checked.
- **Read the working tree, or read what is published.** `npm run collect` reads the
  checkout beside this repository — the developer's loop. `npm run collect:published` clones
  the branch as everybody else sees it, which is what the workflow does, because a page
  describing a tree somebody is halfway through changing is describing something else.
- `src/state/the_bestof.json` is **never committed.** It is a build artifact, and the
  sibling page published last month's test count precisely because the file was there to be
  used. Every step of that build reported success while it happened.

### What a fresh clone does

`npm test` passes on a fresh clone with no state file, because the build hook writes a
stand-in and the page's own test refuses with the command rather than reporting a page it
could not check. **`npm run build` without `npm run collect` builds a page that says it has
nothing to say**, and deletes the stand-in rather than leaving it to be looked at later.

---

## What not to do

- **Do not commit `src/state/the_bestof.json`.**
- **Do not type a fact into `src/pages/index.astro`.** No stage name, no role, no count, no
  verdict. `test/the_page_says_only_what_the_state_says.test.mjs` builds the page and catches
  it — and it caught three sentences the first time it ran, one of them "Two pull requests",
  written by the person who wrote the test.
- **Do not add a field to the state and print it raw.** Decide what it is allowed to say
  first, in `src/page/`, and test that decision.
- **Do not make a missing document render as an empty section.** A document that has been
  reorganised is refused by name, because an empty section reads as "nothing to report" —
  the one answer a reorganised document gives by accident.
- **Do not derive a name.** Every written name on the page is a string lifted out of the
  project's own code or its own document. `Stage::Idle` in a source and `IDLE` in a
  specification are not related by a rule anybody can rely on.
- **Do not let a check compare the wrong thing.** Three readers here counted a subdirectory
  as a file, a `.gitignore` as a module, and an argument list's first element as an argument.
  Each looked correct and each was a fact nobody measured.
- **Do not reach for the network to make a test pass.** Inject the address; the GitHub and
  skip tests run a real `createServer` and a real `fetch`, and they close it afterwards,
  because a suite nobody waits for is a suite that gets skipped.
- **Do not clone one commit deep.** It is the fast way to get a build and it reports a
  history of one commit, so the page would state a year of work as a single commit in total
  confidence.
- **Do not promise a rhythm.** GitHub's `schedule` is best-effort and has been measured in
  this family at 3.4 hours between runs, then 6.1, then not at all. The page says **when it
  read the project** and never when it will.

---

## Publishing only what changed

The live page publishes the state it was built from, so the next run asks the site rather
than a record: no previous run, no token, no deployment history. Two traps:

- **Do not key the skip on the project's commit.** The project stands still, a template is
  fixed, and the page keeps the old template for ever. The comparison is over the whole
  state.
- **A state that cannot be read is a change, never agreement.** A 404, a rate limit, a site
  never published to — every one of those means the comparison did not happen. Publishing
  again is cheap and being wrong is not.

---

## The commit discipline

Two commits per cycle: `test(scope): RED — <the expectation that fails>`, then
`feat(scope)` or `fix(scope)`. **A RED commit that is green is a commit that mislabels
itself**, and that happened twice here and both times was caught by reading `git log` rather
than by a test.

Three things this repository has learned the hard way, each written into a commit message
where a reader will meet them:

- **A reader that excuses a field is a reader that cannot see a change in it.** The first
  comparator normalised the suite's duration and then ignored the whole field, so a suite
  going red inside that field was invisible.
- **A shape change ripples outward and turns tests red for the wrong reason.** A renamed
  fixture and an `await`ed call each made a suite red on something unrelated to what it
  checks, and both cost more time to diagnose than the change that caused them.
- **A comment explaining why a thing is absent contains that thing.** A test that greps a
  source file for a flag finds the flag in the prose about its absence — so the comments
  come off before the grep.

## What is not built yet

Kept short on purpose: a section that grows as the page grows is a section that gets skimmed,
and it gets skimmed precisely when somebody is about to add the thing it does not mention.
Built: the layers · the domain · the glossary · the claims · the history · the suite · the
documentation · GitHub · the skip · the schedule. Not built: a share card, a comparison
against the sibling pages, a per-commit view, and a way to read a file at a ref.

**Deliberately not here:** a `SOURCES.lock`. This repository is a view and pins no source.
