"""A package whose docstring declares five layers and whose tree holds four directories.

**Two of the five hold nothing, in two different ways, and that is the whole fixture.** The
project this page is about declares ten layers and is in both states at once: `creative/` and
`repair/` are empty directories that git does not track, and `web/` holds a `ui/` subdirectory
and no code at all. A fixture with one way of being empty cannot catch a reader that reports
a layer with a module in it, and a fixture where every declared layer exists cannot catch a
reader that confuses a declaration with a directory.

The stage names here are not the project's, and never will be: a reader answering from the
wrong tree has to be caught, and a test that cannot tell the two apart is a test that is
checking nothing.

- `domain/` — the rules, and nothing that could be replaced or argued with.
- `store/` — where a run's record lives, and how a run resumes from one.
- `llm/` — the one place a model is asked a question.
- `web/` — the API and the board, holding a subdirectory and nothing else.
- `repair/` — the supervisor that decides whether a stage is tried again, declared and not written.
"""

from __future__ import annotations

