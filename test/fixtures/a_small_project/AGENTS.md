# The rules, and where each one is held

Every rule this fixture holds itself to, the file that holds it, and what that file is.

| Rule | Held in | Built |
|---|---|---|
| a move is allowed exactly where the table says, and nowhere else | `tests/test_the_table_of_moves.py` | with the domain |
| nothing targets `STORED` | `tests/test_the_table_of_moves.py` | with the domain |
| a manifest is addressed as `owner/name` and by nothing else | `tests/test_the_loaded_manifest.py` | with the manifest |
| every module opens with a docstring | `ruff` `D` | before the first module |
| the domain reaches nothing it may not | `tests/test_the_domain_reaches_nothing.py` | with the domain |
| the default suite needs no network and no credential | `pyproject.toml` `addopts` | before the first test |
| the operator of this project behaves in writing | `docs/how-to-operate.md` | never |

**A rule naming a file that is not there is a rule nobody is holding**, and the last row
names a document this fixture does not have. That is on purpose: a table in which every row
resolves proves nothing about a reader that resolves them.
