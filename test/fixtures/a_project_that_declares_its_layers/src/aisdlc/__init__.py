"""A package whose docstring declares four layers and whose tree holds three of them.

**`web/` is declared and absent, and that is the case this fixture exists for.** The project
this page is about declares ten layers and holds seven, and the gap between the two columns
is the whole argument of the page. A fixture where every declared layer exists cannot catch a
reader that confuses the two, and a reader that confuses them prints "4 layers" where the
truth is "3, and 1 is a promise".

The stage names here are not the project's, and never will be: a reader answering from the
wrong tree has to be caught, and a test that cannot tell the two apart is a test that is
checking nothing.

- `domain/` — the rules, and nothing that could be replaced or argued with.
- `store/` — where a run's record lives, and how a run resumes from one.
- `llm/` — the one place a model is asked a question.
- `web/` — the API and the board, declared and not written.
"""

from __future__ import annotations
