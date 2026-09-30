#!/usr/bin/env python3
"""Print the layers a Python package declares about itself, as JSON on stdout.

A shell first, and it refuses. The tests below it fail on assertions about a package's
docstring rather than on a missing file, because a test that is red for the wrong reason
sends somebody looking for a bug that is not there.
"""

from __future__ import annotations

import sys


class TheLayersAreNotDeclaredError(Exception):
    """A package that does not say which layers it is made of.

    **The refusal is a refusal, not a fallback.** A package whose docstring is empty, or
    which names its layers in a shape this reader does not know, would otherwise be read as
    a package that declares none — and the page would print "0 layers" beside a project
    that says ten. The number a page prints about an architecture it could not read has to
    be absent, and the reason has to be a sentence.
    """


def the_answer_about(a_repository: str) -> dict:
    """Read the layers a repository's package declares. Not implemented yet."""
    raise TheLayersAreNotDeclaredError(
        f"{a_repository} was not read: this reader does not read layers yet."
    )


def main() -> int:
    if len(sys.argv) < 3 or sys.argv[1] != "--repository":
        sys.stderr.write("usage: ask_the_layers.py --repository <path>\n")
        return 2
    try:
        import json

        sys.stdout.write(json.dumps(the_answer_about(sys.argv[2]), indent=2) + "\n")
    except TheLayersAreNotDeclaredError as the_refusal:
        sys.stderr.write(f"{type(the_refusal).__name__}: {the_refusal}\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
