/**
 * The five projects a project was learned from, read out of the document that records them.
 *
 * **A table's first column here has no heading at all** — the header row is
 * `| | what it is | verdict |` — so a reader that maps columns by position reads a name
 * under a heading that is not there and calls the column unnamed. And a reader that maps by
 * heading finds nothing to map *to*. So the first column is read by **being the first**,
 * and the test says why, because the next version of this file will otherwise do it the
 * tidy way and stop.
 *
 * | the document | what this reads | what it does not read |
 * |---|---|---|
 * | `docs/what-this-project-learned.md` §1 | the five projects, what each is, and the verdict each was given | whether the verdict is right |
 * | the same §5 | what is deliberately absent, and the reason given for each | anything else |
 *
 * **The verdict is the project's own and is not checked here.** A page that second-guessed
 * it would be doing what the project already does better — with a suite somebody has to
 * install and run. What the page adds is that the five names and their verdicts are *read*
 * rather than remembered, so the day a sixth project joins the table this page shows it
 * without a line of code changing.
 *
 * A document that is not there is a **value with a sentence**, and a document that has been
 * reorganised is a **refusal by name** — the same pair every other reader in this repository
 * keeps, because the two are different faults and a page rendering a fault as an absence
 * reports a project as emptier than it is.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WHERE_THIS_CAME_FROM = 'docs/what-this-project-learned.md';

const is_a_heading = (a_line) => /^#{1,6}\s/.test(a_line);
const the_words_of = (a_line) => a_line.replace(/^#{1,6}\s+/, '').trim();
const a_row_of = (a_line) =>
	a_line
		.trim()
		.split('|')
		.slice(1, -1)
		.map((a_cell) => a_cell.trim());

/** The lines of the section whose heading starts this way, and not the next one. */
const the_section_starting_with = (the_text, what_the_heading_starts_with) => {
	const the_lines = the_text.split('\n');
	const at = the_lines.findIndex(
		(a_line) => is_a_heading(a_line) && the_words_of(a_line).startsWith(what_the_heading_starts_with),
	);
	if (at === -1) return null;
	const the_end = the_lines.findIndex((a_line, an_index) => an_index > at && is_a_heading(a_line));
	return the_lines.slice(at + 1, the_end === -1 ? the_lines.length : the_end);
};

/** The rows of a table in a section, minus the header and minus any separator. */
const the_rows_of = (a_section) =>
	a_section
		.filter((a_line) => a_line.trim().startsWith('|'))
		.map(a_row_of)
		.slice(1)
		.filter((a_row) => !(a_row[0] ?? '').match(/^-{2,}$/));

/** A cell with its markdown emphasis and its code spans off, and nothing else changed. */
const as_plain_words = (a_cell) => a_cell.replace(/`/g, '').replace(/\*\*/g, '').trim();

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

/**
 * The projects this one was learned from, and what is deliberately not here.
 *
 * @param {string} inside - a checkout of the project
 * @returns {object} the answer, or a refusal, or a value saying the document is not published
 */
export function read_where_it_came_from(inside) {
	const where = join(inside, WHERE_THIS_CAME_FROM);
	if (!existsSync(where)) {
		return {
			was_read: false,
			where_it_was_looked_for: where,
			why_not:
				`${WHERE_THIS_CAME_FROM} is not in this project, so the page cannot say what it was ` +
				`learned from or why, and it says so rather than naming projects it read somewhere else.`,
			the_projects: [],
			what_is_not_here: [],
		};
	}
	const the_text = readFileSync(where, 'utf8');

	const the_projects_section = the_section_starting_with(the_text, '1.');
	if (the_projects_section === null) {
		throw new TheDocumentIsNotReadableError('a section numbered 1 holding the five projects', where);
	}
	const the_absent_section = the_section_starting_with(the_text, '5.');
	if (the_absent_section === null) {
		throw new TheDocumentIsNotReadableError('a section numbered 5 holding what is not here', where);
	}

	return {
		was_read: true,
		where_it_was_read: where,
		why_not: null,
		// **The first column by position, because it has no heading.** The header row is
		// `| | what it is | verdict |`, and a reader that maps columns by heading finds no
		// name for the column holding the names.
		the_projects: the_rows_of(the_projects_section).map((a_row) => ({
			name: as_plain_words(a_row[0]),
			what_it_is: as_plain_words(a_row[1] ?? ''),
			verdict: as_plain_words(a_row[2] ?? ''),
		})),
		what_is_not_here: the_rows_of(the_absent_section).map((a_row) => ({
			what: as_plain_words(a_row[0]),
			why: as_plain_words(a_row[1] ?? ''),
		})),
	};
}
