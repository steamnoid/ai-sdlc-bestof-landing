# Domain glossary

The source of truth for naming in this fixture. **A concept that is not here does not have a
name yet**, and a term in the code that is missing from this file is a violation. This file
names things that are not built yet, because a glossary written from the code only ever
describes yesterday.

## How this file is read

| Where a name is written | What it does |
|---|---|
| a **bolded** entry in `## The core nouns` | a blessed name |
| a code span in the first cell of a declaration table | a blessed name, for the same reason |
| a code span in a cell under **`Not to be called`** | **refused, and not blessed** |
| anything under **`## Banned vocabulary`** | **refused, and not blessed** |
| a code span in ordinary prose | **refused, and not blessed**, which is why a refused word is written in plain prose here |

## The core nouns

| Term | Definition | Not to be called |
|---|---|---|
| **Manifest** | A record of what a project says it needs, addressed as `owner/name` and by nothing else. The unit this fixture is pointed at | `project`, `source`, `target` |
| **Consignment** | One unit of work against a manifest, from commissioning to delivery. Carries the stage, the role and who asked | `task`, `ticket`, `job`, `item` |
| **Stage** | Where a consignment is in its lifecycle. A closed set of two, held as `Stage`, and the only thing that can write one is `transition()` | `status`, `state`, `phase` |
| **Role** | Which discipline is accountable for the result. A closed set of three, held as `Role` | `discipline`, `owner`, `persona` |

## The stages

Two, and the table of legal moves is exhaustive in both directions.

| Stage | An agent must be holding it | What a board says | Not to be called |
|---|---|---|---|
| `STORED` | no | waiting to be collected | `new`, `backlog` |
| `DISPATCHED` | **yes** | on its way | `assigned`, `claimed` |

## The artifacts

Four, in the order a consignment reaches them, each presented to a gate at the version its
agent has worked *that many times*.

| Artifact | Produced by | Contents | Not to be called |
|---|---|---|---|
| `LoadList` | `fixture-loader` | what is in the manifest, and the paths that show it | `inventory`, `summary` |
| `ConsignmentOrder` | `fixture-analyst` | what was asked, and how we will know it worked | `spec`, `brief` |
| `PackingNote` | `fixture-packer` | the crates to fill, and the tests to add | `plan`, `approach` |
| `DeliveryNote` | `fixture-courier` | the branch, the title, the body | `pull request`, `delivery` |

## The refusals

The **Built** column says which of them exists today, so this file can name the future
without claiming it.

| Error | Protects | Built | Not to be called |
|---|---|---|---|
|---|---|---|---|
| --- | --- | built | --- |
| `AStageThatIsNotOneError` | a stage that is not in the closed set of two, or a move the table does not name | built | built |
| `NoSuchConsignmentError` | a lookup that would otherwise invent a consignment | built | `missing`, `unknown` |
| `ACrateThatDoesNotFitError` | a change to a crate that would not fit the consignment | not yet | not yet |
| `TheScheduleWasMissedError` | a dispatch that left after its consignment was due | not yet | not yet |

## The settings

A deployment states these. **Every one is refused rather than defaulted** when it holds
something this system cannot read.

| Setting | What it states | What it is not |
|---|---|---|
| `FIXTURE_CREATIVE_MODE` | `on` makes a manifest brief itself before anything else. Any other value is **refused by name** | a list of things to do |
| `FIXTURE_PROJECTS_DIR` | where runs are written. **Required and never defaulted** | a cache, a temp directory |
| `FIXTURE_WHAT_A_RUN_IS_DOING` | `1` sends every tool call to the terminal | a debug flag, verbosity |

## Banned vocabulary

Generic infrastructure words, banned because each one erases a domain word. A concept that
needs one of these has not been understood well enough to name yet.

`Manager` · `Handler` · `Processor` · `Helper` · `Util` · `Utils` · `Common` · `Base` ·
`Data` · `Info` · `Payload` · `Params` · `Result` · `Item` · `Entity` · `Dto` · `Cfg` ·
`Meta` · `Misc` · `Temp` · `Foo` · `Bar` · `Adapter` · `Wrapper` · `Provider` · `Strategy` ·
`Visitor` · `Observer` · `Listener` · `Callback`
