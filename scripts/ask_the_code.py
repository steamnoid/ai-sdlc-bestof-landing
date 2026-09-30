#!/usr/bin/env python3
"""Print the domain a Python project declares, as JSON on stdout.

**A stage, a role and a table of moves are Python objects, and importing them is the only
reading of them that cannot go stale.** The project this page is about declares six stages
and five roles and seven legal moves, and the page's second section is that table — so it
is read out of the code rather than transcribed out of a document about the code, which is
how a page comes to describe a project that has since deleted a role.

Three refusals are refusals and one thing that is absent is a value. A package with no
`Stage`, no `Role` or no `LEGAL_TRANSITIONS` is a project this reader cannot describe, and
it is stopped. A package with no **router** is a project that has not wired its gates yet,
and that is an ordinary state of a project being built — so it comes back as `null` with a
sentence saying where it looked. A page that could not find a gate map and refused to print
would be a page that cannot be built for half the projects it is for.

Three conventions exist in this family for saying which stages an agent must be holding,
and this reader knows all three and reports which one it used. That report is not
bookkeeping: a table of stages with a column the reader guessed is a table nobody can
check, and a sibling page prints that column beside the rest.
"""

from __future__ import annotations

import importlib
import json
import sys
from enum import Enum
from pathlib import Path

sys.dont_write_bytecode = True

# Read in this order, and reported by name, because a sibling project's table is in a
# state-machine module and this project's is a method on the stage itself.
AN_AGENT_MUST_BE_HOLDING = {
    "two tuples in the state machine": ("STAGES_WITHOUT_AN_AGENT", "STAGES_WITH_AN_AGENT"),
    "a method on the stage": ("__an_agent_must_be_holding_it__",),
    "a property on the stage": ("the_agent_must_be_present",),
}

WHERE_A_GATE_MAP_LIVES = "aisdlc.graph.router"
THE_NAME_A_GATE_MAP_GOES_BY = "WHERE_AN_APPROVED_ARTIFACT_LEADS"


class TheStagesAreNotReadableError(Exception):
    """A package that declares no closed set of stages, so there is no table to print."""


class TheRolesAreNotReadableError(Exception):
    """A package that declares no closed set of roles."""


class TheTableOfLegalMovesIsNotReadableError(Exception):
    """A package with stages and no table of moves between them.

    **A table that is not exhaustive in both directions is not a table**, so a reader that
    accepted a partial one would print a project as though it had said everything it may do.
    """


class TheInvariantSaysNothingAboutAStageError(Exception):
    """A stage the project says nothing about, or two ways at once.

    The invariant has to be total: every stage in exactly one of the two sets. A stage in
    both is contradictory and a stage in neither is unchecked, and a page that printed
    either one as `false` would be inventing a rule the project does not have.
    """


class TheCodeAnsweredFromAnotherTreeError(Exception):
    """The import answered from a tree other than the one this reader was given."""


class ThePackageCannotBeImportedError(Exception):
    """A tree whose package could not be imported, so its domain could not be read."""


def the_answer_about(a_repository: str) -> dict:
    """Everything a project's own code declares about its domain. Not implemented yet."""
    raise TheStagesAreNotReadableError(
        f"{a_repository} was not read: this reader reads no domain yet."
    )


def main() -> int:
    if len(sys.argv) < 3 or sys.argv[1] != "--repository":
        sys.stderr.write("usage: ask_the_code.py --repository <path>\n")
        return 2
    try:
        sys.stdout.write(json.dumps(the_answer_about(sys.argv[2]), indent=2) + "\n")
    except (
        TheStagesAreNotReadableError,
        TheRolesAreNotReadableError,
        TheTableOfLegalMovesIsNotReadableError,
        TheInvariantSaysNothingAboutAStageError,
        TheCodeAnsweredFromAnotherTreeError,
        ThePackageCannotBeImportedError,
    ) as the_refusal:
        sys.stderr.write(f"{type(the_refusal).__name__}: {the_refusal}\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
