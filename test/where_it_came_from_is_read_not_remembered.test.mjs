/**
 * Three projects, three verdicts, and a table whose first column has no heading.
 *
 * **The first column of that table is `| | what it is | verdict |`** — the header cell is
 * empty, so a reader that maps columns by heading finds nothing to map the names to, and one
 * that maps by position calls the column unnamed. The reader uses position and the test says
 * why, because the next version of that file will otherwise do it the tidy way and stop
 * reading the names.
 *
 * **The names here are the fixture's own and never the real ones.** The first version of
 * this file read the project the page is about, and that made it red on every fresh clone and
 * on every runner — which is the failure this repository's own README names, in the sentence
 * about a test that needs a checkout beside this one. The fixture carries its own document
 * and its own three projects, and the real ones have to appear nowhere.
 *
 * The verdicts are **the project's own and are not checked here.** A page that second-guessed
 * them would be doing what the project already does better, with a suite somebody has to
 * install and run. What the page adds is that the names and their verdicts are *read* rather
 * than remembered — so the day a sixth project joins that table, this page shows it without a
 * line of code changing.
 *
 * | the shape | what the reader must answer |
 * |---|---|
 * | a table whose first column has no heading | the names, by position |
 * | a document that is not published | a value with a sentence, and no rows |
 * | a document that has been reorganised | `TheDocumentIsNotReadableError`, naming the section |
 * | a verdict cell full of markdown | the words, with the emphasis off and nothing else changed |
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { read_where_it_came_from } from '../scripts/read_where_it_came_from.mjs';

const the_project = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'a_small_project');
const a_tree_that_is_not_here = resolve('test', 'fixtures', 'a_project_that_is_not_here');

describe('the three projects, and the verdicts they were given', () => {
	const the_answer = read_where_it_came_from(the_project);

	it('names all three, in the order the document lists them', () => {
		strictEqual(
			the_answer.the_projects.length,
			3,
			`the document's table holds three projects and ${the_answer.the_projects.length} were read`,
		);
		ok(
			the_answer.the_projects.every((a_project) => a_project.name.length > 0),
			'a project has no name, which is what happens when the reader maps columns by heading and this table has none for the first',
		);
	});

	it('names no project but the fixture\'s own, because a reader that remembers is a reader that is wrong', () => {
		for (const a_project of the_answer.the_projects) {
			ok(
				!/^ai-sdlc-|^aisdlc-/.test(a_project.name),
				`the project "${a_project.name}" belongs to the project this page is about, so the reader is not reading the document it was given`,
			);
		}
	});

	it('carries what each is and the verdict, both as plain words', () => {
		const the_first = the_answer.the_projects[0];
		ok(the_first.what_it_is.length > 0, 'the description of a project is empty');
		ok(the_first.verdict.length > 0, 'the verdict on a project is empty');
		ok(
			!/[`*]/.test(the_first.verdict),
			`the verdict still carries its markdown: ${the_first.verdict.slice(0, 40)}`,
		);
	});

	it('reads what is deliberately absent, with the reason for each', () => {
		ok(
			the_answer.what_is_not_here.length > 0,
			'the section holding what is not here and why was not read, and that section is the argument against scope creep',
		);
		for (const an_absence of the_answer.what_is_not_here) {
			ok(an_absence.why.length > 0, `"${an_absence.what}" is listed as absent with no reason beside it`);
		}
	});
});

describe('a document that is not published, and one that has moved', () => {
	it('says so in words, and produces no rows', () => {
		const the_answer = read_where_it_came_from(a_tree_that_is_not_here);
		strictEqual(the_answer.was_read, false, 'a document that is not there was read from somewhere');
		strictEqual(
			the_answer.the_projects.length,
			0,
			'a missing document produced rows, and an empty table reads as "nothing to report"',
		);
		match(the_answer.why_not, /what-this-project-learned\.md/, 'the reason does not name the document that was looked for');
	});
});
