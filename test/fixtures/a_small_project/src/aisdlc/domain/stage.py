"""Where a piece of work is, and nothing else.

**Two stages here and six in the project this page is about, and the reader has to be able
to tell the difference.** A reader that carried the project's names would pass a test about
the project and fail a test about the tree it was actually given, and the second test is
the one that says something.
"""

from __future__ import annotations

from enum import Enum


class Stage(Enum):
    """Where a piece of work is, and nothing else."""

    ARRIVED = "ARRIVED"
    DEPARTED = "DEPARTED"

    def in_words(self) -> str:
        """What a board says about a ticket, in the board's own words."""
        return {Stage.ARRIVED: "waiting to leave", Stage.DEPARTED: "gone"}[self]
