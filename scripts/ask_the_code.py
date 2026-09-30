#!/usr/bin/env python3
"""Print the domain a Python project declares, as JSON on stdout.

**A stage, a role and a table of moves are Python objects, and importing them is the only
reading of them that cannot go stale.** The project this page is about declares six stages
and five roles and seven legal moves, and the page's second section is that table — so it
is read out of the code rather than transcribed out of a document about the code, which is
how a page comes to describe a project that has since deleted a role.

Three refusals are refusals and one absence is a value. A package with no `Stage`, no
`Role` or no `LEGAL_TRANSITIONS` is a project this reader cannot describe, and it is
stopped. A package with no **router** is a project that has not wired its gates yet, and
that is an ordinary state of a project being built — so it comes back as `null` with a
sentence saying where it looked. A page that could not find a gate map and refused to print
would be a page that cannot be built for most of the projects it is for.

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
from typing import Any

sys.dont_write_bytecode = True

WHERE_STAGES_LIVE = "aisdlc.domain.stage"
WHERE_ROLES_LIVE = "aisdlc.domain.role"
WHERE_THE_MOVES_LIVE = "aisdlc.domain.state_machine"
THE_NAME_THE_MOVE_TABLE_GOES_BY = "LEGAL_TRANSITIONS"

WHERE_A_GATE_MAP_LIVES = "aisdlc.graph.router"
THE_NAME_A_GATE_MAP_GOES_BY = "WHERE_AN_APPROVED_ARTIFACT_LEADS"

# **The method, and the property, are read before the tuples** — not out of preference, but
# because a method on the stage is the narrowest place the question can be asked and a
# tuple in another module is the widest, and a project that has moved to the narrow one
# should not be reported as still using the wide one. The order decides only which answer
# is read, and whichever is read is named on the page.
A_STAGE_ANSWERS_FOR_ITSELF = "an_agent_must_be_holding_it"
A_STAGE_ANSWERS_WITH_A_PROPERTY = "the_agent_must_be_present"
TWO_TUPLES = ("STAGES_WITHOUT_AN_AGENT", "STAGES_WITH_AN_AGENT")


class TheStagesAreNotReadableError(Exception):
    """A package that declares no closed set of stages, so there is no table to print.

    **A refusal and not an empty table.** An empty stage list reads as a project whose work
    never changes shape, and that is a different claim from a project this reader cannot
    describe.
    """


class TheRolesAreNotReadableError(Exception):
    """A package that declares no closed set of roles."""


class TheTableOfLegalMovesIsNotReadableError(Exception):
    """A package with stages and no table of moves between them.

    A table that is not one row per stage is not a table, and a reader that accepted a
    partial one would print a project as though it had said everything it may do.
    """


class TheInvariantSaysNothingAboutAStageError(Exception):
    """A stage the project says nothing about, or two ways at once.

    The invariant has to be total: every stage in exactly one of the two answers. A stage
    in both is a project contradicting itself and a stage in neither is a project that never
    said, and a page that printed `false` for the second would be inventing a rule.
    """


class TheTableNamesAStageThatIsNotThereError(Exception):
    """A move table naming a stage the enumeration does not have.

    **A tree mid-edit is in this state, and it is a different fact from every other
    refusal here.** A stage deleted from the enumeration leaves the table behind referring
    to it, the module raises an `AttributeError` on import, and a reader that did not catch
    it prints a Python traceback — which is a page saying something about this repository
    that is true, and which no reader can act on.
    """


class TheCodeAnsweredFromAnotherTreeError(Exception):
    """The import answered from a tree other than the one this reader was given."""


class ThePackageCannotBeImportedError(Exception):
    """A tree whose package could not be imported, so its domain could not be read."""


def forget_any_aisdlc_already_imported() -> None:
    """Empty `sys.modules` of this project's package.

    **Two trees in one process otherwise answer with the first one.** A page that reads a
    fixture and then the project has the project's `aisdlc` already loaded and prints the
    fixture's stages under the project's name — which is why a test reads two trees in
    sequence and demands two different answers.
    """
    for a_module_name in [a_name for a_name in sys.modules if a_name == "aisdlc" or a_name.startswith("aisdlc.")]:
        del sys.modules[a_module_name]


def the_tree_that_answered(the_source: Path) -> Any:
    """Import the package with the tree given ahead of anything already installed.

    **The path is put first and not appended**, because an editable install of the same
    package is importable and would otherwise be found first, and the check below would then
    refuse a reader that was handed a correct tree.
    """
    sys.path.insert(0, str(the_source))
    forget_any_aisdlc_already_imported()
    try:
        the_package = importlib.import_module("aisdlc")
    except ImportError as the_failure:
        raise ThePackageCannotBeImportedError(
            f"aisdlc could not be imported from {the_source}: {the_failure}. Its own "
            f"dependencies are needed before its domain can be read, and the command that "
            f"provides them is `uv sync --all-groups --project {the_source.parent}`."
        ) from the_failure

    which = Path(the_package.__file__ or "").resolve()
    if not which.is_relative_to(the_source.resolve()):
        raise TheCodeAnsweredFromAnotherTreeError(
            f"aisdlc resolved to {which}, which is not inside {the_source.resolve()}. An "
            f"editable install left over from another checkout answers every assertion with "
            f"that checkout's domain."
        )
    return the_package


def the_enumeration(where_it_lives: str, what_it_is_called: str, the_refusal) -> list:
    """A closed set of named things, in the order it declares them.

    A project's own order is kept because it is a decision it made: a board shows the
    stages in the order a ticket walks through them, and a reader that sorted them would
    draw a different pipeline from the same code.
    """
    try:
        the_set = getattr(importlib.import_module(where_it_lives), what_it_is_called)
    except (ImportError, AttributeError) as the_failure:
        raise the_refusal(
            f"{where_it_lives}.{what_it_is_called} could not be read: {the_failure}"
        ) from the_failure
    if not (isinstance(the_set, type) and issubclass(the_set, Enum)) or list(the_set) == []:
        raise the_refusal(
            f"{where_it_lives}.{what_it_is_called} is not a closed set with names in it, and a "
            f"page cannot print a table out of one"
        )
    return list(the_set)


def the_table_of_moves(the_stages_declared) -> list[dict]:
    """One row per stage, in the enumeration's order, with its destinations sorted.

    **A terminal stage gets an empty list and not a missing key**, because "nowhere to go"
    and "this reader did not look" are different facts and a page rendering both as nothing
    is a page hiding a refusal.
    """
    try:
        the_table = getattr(
            importlib.import_module(WHERE_THE_MOVES_LIVE), THE_NAME_THE_MOVE_TABLE_GOES_BY
        )
    except (ImportError, AttributeError) as the_failure:
        raise TheTableOfLegalMovesIsNotReadableError(
            f"{WHERE_THE_MOVES_LIVE}.{THE_NAME_THE_MOVE_TABLE_GOES_BY} could not be read: "
            f"{the_failure}"
        ) from the_failure
    if not isinstance(the_table, dict) or the_table == {}:
        raise TheTableOfLegalMovesIsNotReadableError(
            f"{THE_NAME_THE_MOVE_TABLE_GOES_BY} is not a non-empty mapping, and a table with no "
            f"rows is not a table"
        )
    return [
        {
            "from": a_stage.value,
            "to": sorted(a_destination.value for a_destination in the_table.get(a_stage, ())),
        }
        for a_stage in the_stages_declared
    ]


def who_must_be_holding_each_stage(the_stages_declared) -> tuple[list[dict], str]:
    """Which stages an agent must be holding, and the convention the project used to say so.

    The three conventions are tried in a fixed order and the one that answered is named, so
    a reader reading the table can see where the column came from. A stage in both answers,
    or in neither, is refused by name.
    """
    for a_convention, the_reader in (
        ("a method on the stage", _by_a_method_on_the_stage),
        ("a property on the stage", _by_a_property_on_the_stage),
        ("two tuples in the state machine", _by_two_tuples),
    ):
        the_answer = the_reader(the_stages_declared)
        if the_answer is not None:
            return the_answer, a_convention
    raise TheInvariantSaysNothingAboutAStageError(
        "this project says nothing about which stages an agent must be holding: looked for a "
        f"method `{A_STAGE_ANSWERS_FOR_ITSELF}` on each stage, a property "
        f"`{A_STAGE_ANSWERS_WITH_A_PROPERTY}` on each stage, and the pair "
        f"`{TWO_TUPLES[0]}`/`{TWO_TUPLES[1]}` in {WHERE_THE_MOVES_LIVE}. Of the "
        f"{len(the_stages_declared)} stages it declares, "
        f"{', '.join(a_stage.value for a_stage in the_stages_declared)} are in no answer at all. "
        f"A project that says nothing about this is not a project where no stage needs an agent."
    )


def _one_row_per_stage(the_stages_declared, the_holders) -> list[dict]:
    """Every stage in exactly one answer, or a refusal naming any that is in two."""
    the_holders = list(the_holders)
    the_in_both = [a_stage.value for a_stage in the_holders if a_stage not in the_stages_declared]
    if the_in_both:
        raise TheInvariantSaysNothingAboutAStageError(
            f"{', '.join(the_in_both)} is named as needing an agent and is not a stage of this "
            f"project, so the answer and the enumeration disagree about what there is"
        )
    return [
        {"name": a_stage.value, "an_agent_must_be_holding_it": a_stage in the_holders}
        for a_stage in the_stages_declared
    ]


def _by_a_method_on_the_stage(the_stages_declared) -> list[dict] | None:
    the_question = getattr(importlib.import_module(WHERE_STAGES_LIVE).Stage, A_STAGE_ANSWERS_FOR_ITSELF, None)
    if the_question is None or not callable(the_question):
        return None
    return _one_row_per_stage(the_stages_declared, [a_stage for a_stage in the_stages_declared if the_question(a_stage) is True])


def _by_a_property_on_the_stage(the_stages_declared) -> list[dict] | None:
    the_answer = getattr(importlib.import_module(WHERE_STAGES_LIVE).Stage, A_STAGE_ANSWERS_WITH_A_PROPERTY, None)
    if the_answer is None:
        return None
    return _one_row_per_stage(the_stages_declared, [a_stage for a_stage in the_stages_declared if getattr(a_stage, A_STAGE_ANSWERS_WITH_A_PROPERTY) is True])


def _by_two_tuples(the_stages_declared) -> list[dict] | None:
    try:
        the_module = importlib.import_module(WHERE_THE_MOVES_LIVE)
    except AttributeError as the_failure:
        raise TheTableNamesAStageThatIsNotThereError(
            f"{WHERE_THE_MOVES_LIVE} could not be imported: {the_failure}. A table naming a "
            f"stage the enumeration does not have is a tree part-way through an edit, and it is "
            f"not the same fact as a project that declares no invariant."
        ) from the_failure
    if not all(hasattr(the_module, a_name) for a_name in TWO_TUPLES):
        return None
    the_without = list(getattr(the_module, TWO_TUPLES[0]))
    the_with = list(getattr(the_module, TWO_TUPLES[1]))
    the_in_both = [a_stage.value for a_stage in the_with if a_stage in the_without]
    if the_in_both:
        raise TheInvariantSaysNothingAboutAStageError(
            f"{', '.join(the_in_both)} is named both as needing an agent and as not, and a stage "
            f"in both sets is a stage the project contradicts itself about"
        )
    return _one_row_per_stage(the_stages_declared, the_with)


def the_gates() -> tuple[dict | None, str | None]:
    """Where an approved artifact leads, and where it was looked for when it leads nowhere.

    **A project with no gate map is a project that has not wired one yet**, and that is an
    ordinary state for a project being built. So this is a value and not a refusal, and the
    page says in words that there is no map — which is a fact about the project, printed
    honestly, rather than a section that silently did not render.
    """
    try:
        the_router = importlib.import_module(WHERE_A_GATE_MAP_LIVES)
    except ImportError as the_failure:
        return None, (
            f"there is no {WHERE_A_GATE_MAP_LIVES} in this project, and a map of gates is read from "
            f"nowhere else ({WHERE_A_GATE_MAP_LIVES}.{THE_NAME_A_GATE_MAP_GOES_BY}, which is where "
            f"a sibling project keeps it). A project that has not wired its gates yet is a project "
            f"with no gate map, and the page says so rather than inventing one."
        )
    if not hasattr(the_router, THE_NAME_A_GATE_MAP_GOES_BY):
        return None, (
            f"{WHERE_A_GATE_MAP_LIVES} exists and declares no {THE_NAME_A_GATE_MAP_GOES_BY}, and a "
            f"map of gates under another name is not one this reader will guess at"
        )
    the_map = getattr(the_router, THE_NAME_A_GATE_MAP_GOES_BY)
    return ({str(a_artifact): str(where_it_leads) for a_artifact, where_it_leads in the_map.items()}, None)


def the_answer_about(a_repository: str) -> dict:
    """Everything a project's own code declares about its domain."""
    the_source = Path(a_repository) / "src"
    the_package = the_tree_that_answered(the_source)

    the_stages_declared = the_enumeration(WHERE_STAGES_LIVE, "Stage", TheStagesAreNotReadableError)
    the_roles_declared = the_enumeration(WHERE_ROLES_LIVE, "Role", TheRolesAreNotReadableError)
    the_holders, the_convention = who_must_be_holding_each_stage(the_stages_declared)
    the_gate_map, why_no_gates = the_gates()

    return {
        "the_repository_on_disk": a_repository,
        "which_code_answered": str(Path(the_package.__file__ or "").resolve()),
        "stages": the_holders,
        "the_names_the_stages_are_written_as": [a_stage.value for a_stage in the_stages_declared],
        "roles": [a_role.value for a_role in the_roles_declared],
        "moves": the_table_of_moves(the_stages_declared),
        "the_name_the_move_table_goes_by": THE_NAME_THE_MOVE_TABLE_GOES_BY,
        "how_the_project_says_who_must_hold_a_stage": the_convention,
        "gates": the_gate_map,
        "why_the_gates_could_not_be_read": why_no_gates,
    }


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
        TheTableNamesAStageThatIsNotThereError,
        TheCodeAnsweredFromAnotherTreeError,
        ThePackageCannotBeImportedError,
    ) as the_refusal:
        sys.stderr.write(f"{type(the_refusal).__name__}: {the_refusal}\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
