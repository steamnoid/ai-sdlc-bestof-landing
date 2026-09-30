/**
 * A project publishes documents about itself, and every one of them is a claim.
 *
 * Four of the five things in here can be checked against the tree, which is what makes them
 * worth reading rather than transcribing: the dependencies a manifest declares, the rules
 * table that names a file for each rule, the workflow that runs them, and the licence file
 * whose first line the page prints. A page that read a document and printed it verbatim
 * would be a page that is wrong the day the document is.
 *
 * **The comment above a dependency is the reason and not the description.** A project this
 * page is about writes a long block above its five dependencies saying why each one is
 * there, including which frameworks it deliberately does not have and why — and that block
 * is the most valuable thing on the whole page. A reader that read only the list would print
 * five names and lose the argument, which is the part a reader cannot get anywhere else.
 *
 * | the document | what this reads | what it does not read |
 * |---|---|---|
 * | `pyproject.toml` | description, `requires-python`, each dependency with the prose above it, the entry points, the markers, the default selection | a version it cannot see a constraint for |
 * | `AGENTS.md` | the rules table: the rule, the file holding it, and **whether that file exists** | the truth of a rule, which is not a document's to say |
 * | `.github/workflows/*.yml` | the workflow's name and each job's steps, by name | what a step does, which is a shell line and not a fact about the project |
 * | `README.md` | the fenced shell blocks a visitor may run | anything else in it |
 * | `LICENSE` | its first line, which is the licence's own name | the terms |
 *
 * A document that is not there is a **value with a sentence**, and a document that is there
 * and has been reorganised is a **refusal by name**. Those are different faults: a project
 * that publishes no rules table is a project with no rules table, and a page rendering an
 * empty one says "nothing to report" by accident.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const the_name_in = (a_cell) => a_cell.replace(/[`*]/g, '').trim();
const the_code_spans_in = (a_cell) => [...a_cell.matchAll(/`([^`]+)`/g)].map((a_match) => a_match[1]);

/** The lines of one `## heading` section, found by its heading rather than by where it is. */
const the_section_named = (the_text, what_the_heading_says) => {
	const the_lines = the_text.split('\n');
	const at = the_lines.findIndex((a_line) => /^#{1,6}\s/.test(a_line) && a_line.replace(/^#{1,6}\s+/, '').trim() === what_the_heading_says);
	if (at === -1) return null;
	const the_end = the_lines.findIndex((a_line, an_index) => an_index > at && /^#{1,6}\s/.test(a_line));
	return the_lines.slice(at + 1, the_end === -1 ? the_lines.length : the_end);
};

const a_row_of = (a_line) =>
	a_line
		.trim()
		.split('|')
		.slice(1, -1)
		.map((a_cell) => a_cell.trim());

/** The rows of a table, minus any whose first cell is a separator's dashes. */
const the_table_in = (the_lines) =>
	the_lines
		.filter((a_line) => a_line.trim().startsWith('|'))
		.map(a_row_of)
		.filter((a_row) => !(a_row[0] ?? '').match(/^-{2,}$/))
		.slice(1);

/**
 * The quoted names inside one TOML list, and the list is closed by a line holding only `]`.
 *
 * **The first `]` is not the end.** `"httpx[binary]>=0.27"` contains a closing bracket, and
 * a reader that stopped there read one dependency and called it one — a project with five
 * reporting one. The sibling page this is written after has a test for exactly that trap.
 */
const the_names_in_the_list_called = (the_text, what_the_list_is_called) => {
	const the_lines = the_text.split('\n');
	const at = the_lines.findIndex((a_line) => a_line.trim() === `${what_the_list_is_called} = [`);
	if (at === -1) return [];
	const the_names = [];
	for (const a_line of the_lines.slice(at + 1)) {
		if (a_line.trim() === ']') break;
		const a_match = a_line.match(/"([^"]+)"/);
		if (a_match) the_names.push(a_match[1]);
	}
	return the_names;
};

const not_published = (what, where) => ({	was_read: false,
	where_it_was_looked_for: where,
	why_not: `${what} is not in this project, so the page cannot say what it holds, and it says so rather than showing an empty section. A project that publishes no ${what} is not a project with nothing in it.`,
});

export class TheDocumentIsNotReadableError extends Error {
	constructor(what_is_missing, where_it_was_looked_for) {
		super(
			`${what_is_missing} — looked for in ${where_it_was_looked_for}. A document that has been ` +
				`reorganised is refused by name rather than rendered as an empty section, because an ` +
				`empty section reads as "nothing to report" and that is the one answer a reorganised ` +
				`document gives by accident.`,
		);
		this.name = 'TheDocumentIsNotReadableError';
	}
}

/** The dependencies a manifest declares, and the prose each one sits under. */
export function read_the_manifest(at) {
	return { ...not_published('a `pyproject.toml`', join(at, 'pyproject.toml')), the_rules: [], the_dependencies: [], the_blocks: [] };
}

/** The rules a project says it holds, the file holding each, and whether that file is there. */
export function read_the_rules(at) {
	return { ...not_published('an `AGENTS.md`', join(at, 'AGENTS.md')), the_rules: [], the_dependencies: [], the_blocks: [] };
}

/** What the continuous integration runs, by name. */
export function read_the_workflows(at) {
	return { ...not_published('a workflow', join(at, '.github', 'workflows')), the_workflows: [] };
}

/** The shell blocks a visitor may run, and the licence's own name. */
export function read_what_a_visitor_may_run(at) {
	return { ...not_published('a `README.md`', join(at, 'README.md')), the_rules: [], the_dependencies: [], the_blocks: [] };
}

export function read_the_licence(at) {
	if (!existsSync(join(at, 'LICENSE'))) {
		return { is_stated: false, name: null, where_it_was_looked_for: join(at, 'LICENSE') };
	}
	return { is_stated: true, name: null, where_it_was_looked_for: join(at, 'LICENSE') };
}
