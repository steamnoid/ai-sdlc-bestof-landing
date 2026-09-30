"""Where a piece of work is, and nothing else."""

from __future__ import annotations

from enum import Enum


class Stage(Enum):
    """Two stages, and both of them are the project's own names."""

    ARRIVED = "ARRIVED"
    DEPARTED = "DEPARTED"
