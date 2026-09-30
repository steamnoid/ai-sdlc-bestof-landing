"""The table of legal moves, and the half of the invariant that says who is holding.

**The convention here is two tuples, and the project this page is about uses a method on
the stage instead.** Both are in the family, and a reader that knew only one of them
would report the other as a project that says nothing about who holds its work — which is
a third thing, and a page printing it would be printing an absence as a fact.
"""

from __future__ import annotations

from aisdlc.domain.stage import Stage

# Every stage has a row and every destination is a stage. There is no `otherwise` clause.
LEGAL_TRANSITIONS: dict[Stage, frozenset[Stage]] = {
    Stage.ARRIVED: frozenset({Stage.DEPARTED}),
    Stage.DEPARTED: frozenset(),
}

STAGES_WITHOUT_AN_AGENT = (Stage.ARRIVED,)
STAGES_WITH_AN_AGENT = (Stage.DEPARTED,)
