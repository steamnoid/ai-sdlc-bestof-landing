"""The refusals this fixture declares, and the ones it does not.

**Two of the four names in the fixture's glossary are declared here and two are not**, on
purpose: a check that finds every claim holding is a check that proves nothing, and a check
that finds every claim refuted is a page that has stopped being useful. All four outcomes
have to be on one table for the page to show what it is.
"""

from __future__ import annotations


class AStageThatIsNotOneError(Exception):
    """A stage that is not in the closed set of two, or a move the table does not name."""


class TheScheduleWasMissedError(Exception):
    """A dispatch that left after its consignment was due.

    **The glossary calls this one a promise and this file declares it.** That is the fourth
    outcome — a claim that understates what the tree holds — and it is the one a project
    marks down rather than up.
    """
