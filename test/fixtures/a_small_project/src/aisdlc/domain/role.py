"""Which discipline answers for a result, and this project has three of its own."""

from __future__ import annotations

from enum import Enum


class Role(Enum):
    """The discipline accountable for a result."""

    PORTER = "PORTER"
    CLERK = "CLERK"
    WARDEN = "WARDEN"
