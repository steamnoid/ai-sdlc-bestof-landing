# What this project learned from three projects

Three projects, and every decision this repository makes is written here with its reason.

## 1. The three projects

| | what it is | verdict |
|---|---|---|
| `a-python-monolith` | Python, one package, four layers | **The state machine** — and the only project whose layers anything imports |
| `a-rust-port` | Rust, one crate, six dependencies | **The model layer**, and the worst pairing discipline in the family |
| `a-browser-board` | a board that renders the other's run | **The only interface in the family**, and the only one nobody shipped a build of |

## 2. What worked

A rule is worth a row in this file or it is worth a comment in the code.

## 5. What is not here, and why

| not here | why |
|---|---|
| Graph framework | a list of stages is not a framework problem |
| Vector store | the pipeline reads a clone, and the cost is better stated than hidden |
| A second interface | one board that works beats two that half-work |
