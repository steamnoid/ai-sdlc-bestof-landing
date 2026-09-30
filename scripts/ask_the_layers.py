#!/usr/bin/env python3
"""Print the layers a Python package declares about itself, as JSON on stdout.

**A package's architecture is written in its own docstring, and importing it is the only
reading of that which cannot go stale.** The project this page is about declares ten layers
in `src/aisdlc/__init__.py` and holds seven of them on disk, and the difference between the
two numbers is the page — so this reader is given the project and imports it, and never
transcribes a layer name out of it.

Two guards, and both exist because a sibling project was caught by each of them.

**Nothing is written into somebody else's tree.** `sys.dont_write_bytecode` is set before
the import, because importing a package writes a `.pyc` beside every module it reached, and
a page build that leaves artefacts in the repository it is describing is a build that
edited its input.

**The code that answered is named, and checked.** An editable install left over from
another checkout is importable, passes every assertion, and reports that checkout's
architecture with total confidence — so the answer carries the file that produced it and
refuses when that file is not under the tree it was given.
"""

from __future__ import annotations

import importlib
import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True

# **One line, one layer.** The shape is a backticked name carrying its own slash and then
# an em dash. A layer written without the slash, or with a bullet that carries no name, is
# not a layer this reader knows how to read, and a pattern that guessed at it would report
# a package declaring layers it does not have.
A_LAYER_IS_DECLARED = re.compile(r"^-\s+`(?P<name>[A-Za-z_][A-Za-z0-9_]*)/`\s+—\s+(?P<what_it_holds>.+?)\s*$")


class TheLayersAreNotDeclaredError(Exception):
    """A package that does not say which layers it is made of, in a shape this reader knows.

    **The refusal is a refusal and not a fallback.** A package whose docstring is empty, or
    which names its layers in some other way, would otherwise be read as a package that
    declares none — and the page would print "0 layers" beside a project that says ten.
    The number a page prints about an architecture it could not read has to be absent, and
    the reason has to be a sentence.
    """


class TheCodeAnsweredFromAnotherTreeError(Exception):
    """The import answered from a tree other than the one this reader was given.

    An editable install from another checkout is importable, satisfies every assertion and
    reports that checkout's architecture in total confidence. The name in `which_code_answered`
    is printed on the page, so the reader refuses rather than reporting a lie with a source
    on it.
    """


def forget_any_aisdlc_already_imported() -> None:
    """Empty `sys.modules` of this project's package.

    **Two trees in one process otherwise answer with the first one.** A page that reads a
    fixture and then the project has the project's `aisdlc` already in `sys.modules` and
    prints the fixture's architecture under the project's name. A sibling landing page hit
    this and added a test that reads two trees in sequence and demands two different
    answers; this is the guard that test exists for.
    """
    for a_module_name in [a_name for a_name in sys.modules if a_name == "aisdlc" or a_name.startswith("aisdlc.")]:
        del sys.modules[a_module_name]


class ThePackageCannotBeImportedError(Exception):
    """A tree whose package could not be imported, so its docstring could not be read.

    A refusal and not a fallback: a package that will not import is a checkout that is not
    installed, and a reader that answered about it from anywhere else would be reporting
    some other project's architecture under this one's name. The message says what to do,
    because the fix is one command and a reader who has to guess it will not.
    """


def the_source_directory_of(a_repository: str) -> Path:
    """Where a checkout keeps the sources its packages are imported from."""
    return Path(a_repository) / "src"


def the_tree_that_answered(the_source: Path) -> tuple[object, Path]:
    """Import the package and the file that answered, refused unless it is the tree given.

    **Both halves come back together, because a second import is a second answer.** An
    installed copy of the same package can be found between the two calls, and the file
    this names would then not be the file that was read. The check is on the resolved path
    rather than on the module's own idea of where it lives, because a symlinked checkout
    resolves to a path that looks like somebody else's and is this one.
    """
    sys.path.insert(0, str(the_source))
    forget_any_aisdlc_already_imported()
    try:
        the_package = importlib.import_module("aisdlc")
    except ImportError as the_failure:
        raise ThePackageCannotBeImportedError(
            f"aisdlc could not be imported from {the_source}: {the_failure}. The package's own "
            f"dependencies are needed before its architecture can be read, and the command that "
            f"provides them is `uv sync --all-groups --project {the_source.parent}`."
        ) from the_failure

    which = Path(the_package.__file__ or "").resolve()
    if not which.is_relative_to(the_source.resolve()):
        raise TheCodeAnsweredFromAnotherTreeError(
            f"aisdlc resolved to {which}, which is not inside {the_source.resolve()}. An editable "
            f"install left over from another checkout answers every assertion with that "
            f"checkout's architecture."
        )
    return the_package, which


def the_layers_the_docstring_declares(the_docstring: str) -> list[dict]:
    """The layers a package's docstring names, in the order it names them.

    A line that carries no name in the shape this reader knows is skipped rather than
    refused, because a docstring is prose with a list in it and prose has other lines. A
    docstring with **no** such line at all is refused by the caller, because that is a
    different fact and a reader that guessed here would report an architecture of zero.
    """
    the_layers = []
    for a_line in the_docstring.splitlines():
        a_match = A_LAYER_IS_DECLARED.match(a_line)
        if a_match is None:
            continue
        the_layers.append(
            {"name": a_match.group("name"), "what_it_holds": a_match.group("what_it_holds")}
        )
    return the_layers


def the_answer_about(a_repository: str) -> dict:
    """Everything a package says about the layers it is made of."""
    the_source = the_source_directory_of(a_repository)
    the_package, which_code = the_tree_that_answered(the_source)

    the_docstring = the_package.__doc__ or ""
    the_layers = the_layers_the_docstring_declares(the_docstring)
    if the_layers == []:
        raise TheLayersAreNotDeclaredError(
            f"{which_code} has a docstring and no layer declared in it, in the shape this "
            f"reader knows: a bullet, a backticked name carrying its own slash, and an em "
            f"dash. A package that declares no layers and a package whose docstring was "
            f"reorganised are different facts, and a reader that guessed between them would "
            f"print an architecture of zero for a project that has one."
        )

    return {
        "the_repository_on_disk": a_repository,
        "which_code_answered": str(which_code),
        "the_layers": the_layers,
    }


def main() -> int:
    if len(sys.argv) < 3 or sys.argv[1] != "--repository":
        sys.stderr.write("usage: ask_the_layers.py --repository <path>\n")
        return 2
    try:
        sys.stdout.write(json.dumps(the_answer_about(sys.argv[2]), indent=2) + "\n")
    except (
        TheLayersAreNotDeclaredError,
        TheCodeAnsweredFromAnotherTreeError,
        ThePackageCannotBeImportedError,
    ) as the_refusal:
        sys.stderr.write(f"{type(the_refusal).__name__}: {the_refusal}\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
