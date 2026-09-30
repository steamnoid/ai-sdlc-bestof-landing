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
	const where = join(at, 'pyproject.toml');
	if (!existsSync(where)) return { ...not_published('a `pyproject.toml`', where), the_dependencies: [] };
	const the_text = readFileSync(where, 'utf8');

	const the_description = the_text.match(/^description\s*=\s*"([^"]+)"/m)?.[1] ?? null;
	const the_python = the_text.match(/^requires-python\s*=\s*"([^"]+)"/m)?.[1] ?? null;
	const the_entry_point = the_text.match(/^\w[\w-]*\s*=\s*"([\w.]+:[^"]+)"/m)?.[1] ?? null;

	const the_markers_block = the_text.match(/markers\s*=\s*\[([^\]]*)\]/)?.[1] ?? '';
	const the_markers = [...the_markers_block.matchAll(/"([^"]+)"/g)].map((a_match) => a_match[1].split(':')[0].trim());

	return {
		was_read: true,
		where_it_was_read: where,
		why_not: null,
		description: the_description,
		python: the_python,
		entry_point: the_entry_point,
		how_the_default_suite_is_kept_free:
			the_text.match(/^addopts\s*=\s*"([^"]+)"/m)?.[1] ?? null,
		the_markers,
		// **The prose above the list, carried whole.** This is the project's own argument for
		// each dependency and for the ones it deliberately does not have, and it is the one
		// part of a manifest no other repository can supply.
		what_it_says_about_its_dependencies: the_text
			.split('\n')
			.filter((a_line) => a_line.trim().startsWith('#'))
			.map((a_line) => a_line.replace(/^#\s?/, ''))
			.filter((a_line) => a_line !== '')
			.join('\n')
			.trim(),
		// **Only inside the `dependencies` list.** A reader that scanned the whole file for a
		// quoted string also finds the entry point, every pytest marker and every prose value
		// — four things that are not dependencies, and a page reporting eight dependencies
		// for a project that has two. The list is closed by a line that is only `]`, and not
		// by the first `]` seen, because `"httpx[binary]>=0.27"` contains one.
		the_dependencies: the_names_in_the_list_called(the_text, 'dependencies').map((a_name_and_rest) => {
			const a_match = /^([a-zA-Z0-9_.-]+)([<>=!~ ]*)(.*)$/.exec(a_name_and_rest);
			return {
				name: a_match[1],
				constraint: `${a_match[2]}${a_match[3]}`.trim() || null,
			};
		}),
	};
}

/** The rules a project says it holds, the file holding each, and whether that file is there. */
export function read_the_rules(at) {
	const where = join(at, 'AGENTS.md');
	if (!existsSync(where)) return { ...not_published('an `AGENTS.md`', where), the_rules: [] };
	const the_rows = the_table_in(the_section_named(readFileSync(where, 'utf8'), 'The rules, and where each one is held') ?? []);

	return {
		was_read: true,
		where_it_was_read: where,
		why_not: null,
		the_rules: the_rows.map((a_row) => {
			// **A cell holding a bare word is a tool, and a tool is not a file.** `ruff` `D` and
			// `pyproject.toml` `addopts` name a program and a setting, and asking whether
			// `ruff` "exists" as a path answers a question nobody asked.
			const the_holding = a_row[1] ?? '';
			const the_file = the_code_spans_in(the_holding).find((a_span) => a_span.includes('/')) ?? null;
			return {
				rule: a_row[0] ?? null,
				held_by: the_holding,
				// **`null` for a tool and not `false`.** A rule held by lint is held; a rule
				// held by a file that is missing is not. Those are three states and a boolean
				// has two.
				the_file_holding_it: the_file,
				is_there: the_file === null ? null : existsSync(join(at, the_file)),
			};
		}),
	};
}

/** What the continuous integration runs, by name. */
export function read_the_workflows(at) {
	const where = join(at, '.github', 'workflows');
	if (!existsSync(where)) return { ...not_published('a workflow', where), the_workflows: [] };
	return {
		was_read: true,
		where_it_was_looked_for: where,
		why_not: null,
		the_workflows: readdirSync(where)
			.filter((a_name) => a_name.endsWith('.yml'))
			.sort()
			.map((a_name) => {
				const the_text = readFileSync(join(where, a_name), 'utf8');
				return {
					file: `.github/workflows/${a_name}`,
					name: the_text.match(/^name:\s*(.+)$/m)?.[1].trim() ?? null,
					how_many_jobs: [...the_text.matchAll(/^ {2}\w[\w-]*:$/gm)].length,
					the_steps: [...the_text.matchAll(/^\s+- name:\s*(.+)$/gm)].map((a_match) => a_match[1].trim()),
				};
			}),
	};
}

/** The shell blocks a visitor may run, and the licence's own name. */
export function read_what_a_visitor_may_run(at) {
	const where = join(at, 'README.md');
	if (!existsSync(where)) return { ...not_published('a `README.md`', where), the_blocks: [] };
	return {
		was_read: true,
		where_it_was_read: where,
		why_not: null,
		the_blocks: [...readFileSync(where, 'utf8').matchAll(/```(\w+)\n([\s\S]*?)```/g)]
			.filter((a_match) => a_match[1] === 'bash' || a_match[1] === 'sh')
			.map((a_match) => a_match[2].trim().split('\n')),
	};
}

export function read_the_licence(at) {
	const where = join(at, 'LICENSE');
	if (!existsSync(where)) {
		return { is_stated: false, name: null, where_it_was_looked_for: where };
	}
	// **The file's own first line.** A licence is named by its own words, and a reader that
	// recognised this one as permissive would be guessing — `All Rights Reserved` is a real
	// licence file and the project this page is about has one.
	return {
		is_stated: true,
		name: readFileSync(where, 'utf8').split('\n')[0].trim(),
		where_it_was_looked_for: where,
	};
}
