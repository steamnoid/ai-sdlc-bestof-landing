/**
 * Everything a project publishes as the source of truth for its own naming.
 *
 * **The file says how it may be read, so it is read that way and the page prints the
 * rules beside the reading.** The project this page is about publishes a glossary with six
 * tables, six different header rows, and a section named "How this file is read" holding a
 * table that says which cells are names and which hold words that are not. This reader
 * reports those rules verbatim and then obeys them.
 *
 * | what is on disk | what this answers |
 * |---|---|
 * | a glossary | its reading rules, its blessed terms, its stages, its artifacts, its refusals, its settings, its banned words |
 * | a cell in a column headed as a prohibition | code spans only, and a bare word is not a name |
 * | a bolded first cell | a blessed term |
 * | a separator row | a row, and not a name, **even when it carries text in one cell** |
 * | a `Built` column | the project's own claim about itself, carried and left unresolved |
 * | no glossary | a value with a sentence naming the file that was looked for |
 * | a glossary without one of its tables | `TheGlossaryIsNotReadableError`, naming the table |
 *
 * Two refusals are deliberately not refusals. A **missing file** is a project that has not
 * published one, which is a fact the page prints rather than a fault in the reader. A
 * **missing table inside a published file** is a file that was reorganised, and a reader that
 * carried on would render an empty section — which reads as "nothing to report", the one
 * answer a reorganised document gives by accident.
 *
 * Nothing here decides whether a claim is true. `Built` is carried as a string, and the
 * verdict layer is where a project is held to it, because a reader that resolved the column
 * against the same tree it just read would be checking the project against itself.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WHERE_A_GLOSSARY_LIVES = 'docs/domain-glossary.md';

const is_a_heading = (a_line) => /^#{1,6}\s/.test(a_line);
const the_words_of = (a_heading) => a_heading.replace(/^#{1,6}\s+/, '').trim();
const the_name_in = (a_cell) => a_cell.replace(/[`*]/g, '').trim();
const the_code_spans_in = (a_cell) => [...a_cell.matchAll(/`([^`]+)`/g)].map((a_match) => a_match[1]);

/** The lines of one section, found by its heading rather than by where it happens to be. */
const the_section_named = (the_text, what_the_heading_says) => {
	const the_lines = the_text.split('\n');
	const at = the_lines.findIndex((a_line) => is_a_heading(a_line) && the_words_of(a_line) === what_the_heading_says);
	if (at === -1) return null;
	const the_end = the_lines.findIndex((a_line, an_index) => an_index > at && is_a_heading(a_line));
	return the_lines.slice(at + 1, the_end === -1 ? the_lines.length : the_end).join('\n');
};

const a_row_of = (a_line) =>
	a_line
		.trim()
		.split('|')
		.slice(1, -1)
		.map((a_cell) => a_cell.trim());

/**
 * The rows of the first table in a section, with its header row.
 *
 * **A row is a separator when its first cell is dashes, and not when every cell is.**
 * The project this page is about has a `| --- | --- | built | --- |` row under its refusals:
 * someone left the word in the neighbouring column while drawing the rule. Skipping only a
 * full `|---|---|---|` row reports a refusal named `---` that is built, which is a name no
 * project has and a claim about it.
 */
const the_table_in = (a_section) => {
	const the_rows = a_section.split('\n').filter((a_line) => a_line.trim().startsWith('|')).map(a_row_of);
	const the_body = the_rows.filter((a_row) => !(a_row[0] ?? '').match(/^-{2,}$/));
	return { the_headings: the_body[0] ?? [], the_rows: the_body.slice(1) };
};

const the_table_in_the_section_named = (the_text, what_the_heading_says, where) => {
	const the_section = the_section_named(the_text, what_the_heading_says);
	if (the_section === null) {
		throw new TheGlossaryIsNotReadableError(
			`the section "## ${what_the_heading_says}", which this glossary is read through`,
			where,
		);
	}
	const { the_headings, the_rows } = the_table_in(the_section);
	if (the_headings.length === 0) {
		throw new TheGlossaryIsNotReadableError(
			`a table under "## ${what_the_heading_says}"`,
			where,
		);
	}
	return { the_headings, the_rows };
};

/** The column a table calls by one of several names, and whether it is a prohibition. */
const the_column_named = (the_headings, ...the_names) => {
	const at = the_headings.findIndex((a_heading) => the_name_in(a_heading) === the_name_in(the_names[0]));
	if (at === -1) return null;
	return { at, is_a_prohibition: the_names.length > 1 };
};

export class TheGlossaryIsNotReadableError extends Error {
	constructor(what_is_missing, where_it_was_looked_for) {
		super(
			`${what_is_missing} — looked for in ${where_it_was_looked_for}. A glossary that has ` +
				`been reorganised is refused by name rather than rendered as an empty section, ` +
				`because an empty section reads as "nothing to report" and that is the one answer ` +
				`a reorganised document gives by accident.`,
		);
		this.name = 'TheGlossaryIsNotReadableError';
	}
}

const NOT_TO_BE_CALLED = 'Not to be called';

export function read_the_glossary(inside) {
	const where = join(inside, WHERE_A_GLOSSARY_LIVES);
	if (!existsSync(where)) {
		return {
			was_read: false,
			where_it_was_looked_for: where,
			why_not:
				`${WHERE_A_GLOSSARY_LIVES} is not in this project, so the page cannot name what the ` +
				`project blesses, and it says so rather than reading a list out of the code. A ` +
				`project that publishes no glossary is not a project with no terms.`,
			the_terms_it_blesses: [],
			the_stages: [],
			the_artifacts: [],
			the_refusals: [],
			the_settings: [],
			the_words_it_refuses: [],
			how_the_file_says_it_is_read: [],
		};
	}

	const the_text = readFileSync(where, 'utf8');
	const how_it_is_read = the_table_in_the_section_named(the_text, 'How this file is read', where);

	const the_nouns = the_table_in_the_section_named(the_text, 'The core nouns', where);
	const refused_in = (the_row, the_headings) => {
		const the_column = the_column_named(the_headings, NOT_TO_BE_CALLED, `${NOT_TO_BE_CALLED}`);
		return the_column === null ? [] : the_code_spans_in(the_row[the_column.at] ?? '');
	};

	const the_stages_table = the_table_in_the_section_named(the_text, 'The stages', where);
	const the_holder_column = the_stages_table.the_headings.findIndex((a_heading) =>
		the_name_in(a_heading).toLowerCase().includes('an agent must be holding it'),
	);
	const the_board_column = the_stages_table.the_headings.findIndex((a_heading) =>
		the_name_in(a_heading).toLowerCase().includes('what a board says'),
	);
	if (the_holder_column === -1) {
		throw new TheGlossaryIsNotReadableError(
			'a column saying which stages an agent must be holding',
			`${where}, "## The stages"`,
		);
	}

	const the_artifacts_table = the_table_in_the_section_named(the_text, 'The artifacts', where);
	const the_produced_by = the_column_named(the_artifacts_table.the_headings, 'Produced by');
	if (the_produced_by === null) {
		throw new TheGlossaryIsNotReadableError('a "Produced by" column', `${where}, "## The artifacts"`);
	}

	const the_refusals_table = the_table_in_the_section_named(the_text, 'The refusals', where);
	const the_built_column = the_column_named(the_refusals_table.the_headings, 'Built');
	if (the_built_column === null) {
		throw new TheGlossaryIsNotReadableError('a "Built" column', `${where}, "## The refusals"`);
	}

	const the_settings_table = the_table_in_the_section_named(the_text, 'The settings', where);

	const the_banned_section = the_section_named(the_text, 'Banned vocabulary') ?? '';
	const the_banned_words = the_code_spans_in(
		the_banned_section.split('\n').filter((a_line) => !a_line.trim().startsWith('|')).join('\n'),
	).flatMap((a_span) => a_span.split('·').map((a_word) => a_word.replace(/[`\s]/g, '')).filter(Boolean));

	return {
		was_read: true,
		where_it_was_read: where,
		why_not: null,
		how_the_file_says_it_is_read: how_it_is_read.the_rows.map((a_row) => ({
			where: a_row[0],
			what_it_does: a_row[1] ?? null,
		})),
		the_terms_it_blesses: the_nouns.the_rows.map((a_row) => ({
			name: the_name_in(a_row[0]),
			defined_as: a_row[1] ?? null,
			refused_names: refused_in(a_row, the_nouns.the_headings),
		})),
		the_stages: the_stages_table.the_rows.map((a_row) => ({
			name: the_name_in(a_row[0]),
			// **`**yes**` is a yes.** The file bolds the two stages an agent must be holding
			// and leaves the rest plain, and a reader that compared the cell to `yes` would
			// read the two bolded rows as `false` — reporting the invariant's own
			// load-bearing half backwards.
			an_agent_must_be_holding_it: the_name_in(a_row[the_holder_column]).toLowerCase() === 'yes',
			what_a_board_says: the_board_column === -1 ? null : (a_row[the_board_column] ?? null),
		})),
		the_artifacts: the_artifacts_table.the_rows.map((a_row) => ({
			name: the_name_in(a_row[0]),
			produced_by: the_code_spans_in(a_row[the_produced_by.at] ?? '')[0] ?? null,
			contents: a_row[the_produced_by.at + 1] ?? null,
			refused_names: refused_in(a_row, the_artifacts_table.the_headings),
		})),
		the_refusals: the_refusals_table.the_rows.map((a_row) => ({
			name: the_name_in(a_row[0]),
			protects: a_row[1] ?? null,
			// **Carried as the project's own claim, and deliberately not resolved here.**
			// Checking it needs the source tree, and doing that in this reader would be
			// holding a project to a claim using the same tree that made the claim.
			is_built: the_name_in(a_row[the_built_column.at]).toLowerCase() === 'built',
		})),
		the_settings: the_settings_table.the_rows.map((a_row) => ({
			name: the_code_spans_in(a_row[0])[0] ?? the_name_in(a_row[0]),
			what_it_states: a_row[1] ?? null,
			what_it_is_not: a_row[2] ?? null,
		})),
		the_words_it_refuses: the_banned_words,
	};
}
