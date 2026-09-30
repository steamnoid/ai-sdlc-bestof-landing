/**
 * A glossary is a contract, and this reader reads it by its own rules rather than by position.
 *
 * The project this page is about publishes a glossary with six tables, six different header
 * rows, and a section named "How this file is read" that says in a table how a machine is
 * allowed to read the rest of it. That section is the reason this reader decides by **column
 * header** and not by position: a cell in a column headed as a prohibition holds a word that
 * is *not* a name, and a sibling project's reader took every code span in the file and so
 * blessed every banned noun and every forbidden synonym while every rule in that file stayed
 * green.
 *
 * So the reader reports what the file says about being read, and then obeys it.
 *
 * | the reader is asked | it must answer |
 * |---|---|
 * | how does this file say it is read | its own rules, verbatim, so the page can print them |
 * | what names does it bless | one per declaration table, from the first cell |
 * | what words does it refuse | code spans under a column headed as a prohibition, and nothing else |
 * | a word in a prohibited column that is not a code span | **no name**, which is the whole point |
 * | which refusals exist today | the `Built` column, carried as a claim and left unresolved here |
 * | a separator row carrying text in one cell | a row that is not a name, and not a refusal that is built |
 * | a file that is not published | a value with a sentence, never an empty section |
 * | a table the file does not have | `TheGlossaryIsNotReadableError`, naming the table |
 *
 * The fixture carries the separator trap on purpose, because the real file has it: a row
 * reading `| --- | --- | built | --- |` under the refusals table, which a reader that skips
 * only `|---|---|---|` reports as a refusal named `---` that is built.
 */

import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { read_the_glossary } from '../scripts/read_the_glossary.mjs';

const the_project = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'a_small_project');

describe('the glossary, read by the rules it states about itself', () => {
	it('reports how the file says it is to be read, and reports it from the file', () => {
		const the_glossary = read_the_glossary(the_project);
		strictEqual(the_glossary.was_read, true, 'the glossary is not on disk, so the fixture is not the fixture');
		deepStrictEqual(
			the_glossary.how_the_file_says_it_is_read.map((a_rule) => a_rule.where),
			[
				'a **bolded** entry in `## The core nouns`',
				'a code span in the first cell of a declaration table',
				'a code span in a cell under **`Not to be called`**',
				'anything under **`## Banned vocabulary`**',
				'a code span in ordinary prose',
			],
			'the reading contract is not the file\'s, so a reader following it is following something else',
		);
	});

	it('blesses the four terms in the core nouns, and refuses what each says not to be called', () => {
		const the_manifest = read_the_glossary(the_project).the_terms_it_blesses.find(
			(a_term) => a_term.name === 'Manifest',
		);
		ok(the_manifest, 'a term the file blesses is missing from the answer');
		strictEqual(
			the_manifest.refused_names.join(', '),
			'project, source, target',
			'the words in a column headed as a prohibition were not refused, and that column is the only place a name can be refused',
		);
	});

	it('takes no name from a prohibited cell that holds a word rather than a code span', () => {
		// **The real file has this.** The refusals table's `Not to be called` column holds
		// the word `built` on rows where the first cell is a real name — a copy of the
		// neighbouring column. A reader that took cell text would bless the word `built` as
		// a name this system defines, and the page would print it.
		const refused = read_the_glossary(the_project).the_terms_it_blesses
			.flatMap((a_term) => a_term.refused_names)
			.concat(read_the_glossary(the_project).the_words_it_refuses);
		ok(
			!refused.includes('built'),
			`the word "built" was read as a name, and it is a word in a cell the file marks as a prohibition`,
		);
		ok(
			!refused.includes('not yet'),
			'the phrase "not yet" was read as a name',
		);
	});

	it('carries the banned block as refused words, and none of them as names', () => {
		const the_glossary = read_the_glossary(the_project);
		ok(
			the_glossary.the_words_it_refuses.includes('Manager'),
			'the banned block was not read, so the file\'s own list of words it refuses is missing',
		);
		ok(
			!the_glossary.the_terms_it_blesses.some((a_term) => a_term.name === 'Manager'),
			'a banned word was blessed as a term, which is exactly what the file says must not happen',
		);
	});

	it('refuses no name from the word "a" or from a sentence, because a cell is not a name', () => {
		const every_name = [
			...read_the_glossary(the_project).the_terms_it_blesses.map((a_term) => a_term.name),
			...read_the_glossary(the_project).the_artifacts.map((an_artifact) => an_artifact.name),
			...read_the_glossary(the_project).the_refusals.map((a_refusal) => a_refusal.name),
		];
		for (const a_name of every_name) {
			ok(/^[A-Z][A-Za-z]*$/.test(a_name), `the name "${a_name}" is not shaped like a name the file writes as one`);
		}
	});
});

describe('the stages the glossary publishes, which is a claim about the code', () => {
	it('reads the agent column as a yes or a no, bolded or not', () => {
		deepStrictEqual(
			read_the_glossary(the_project).the_stages,
			[
				{ name: 'STORED', an_agent_must_be_holding_it: false, what_a_board_says: 'waiting to be collected' },
				{ name: 'DISPATCHED', an_agent_must_be_holding_it: true, what_a_board_says: 'on its way' },
			],
			'the column is read as a boolean or not at all, and a bolded yes is still a yes',
		);
	});
});

describe('the artifacts the glossary publishes', () => {
	it('names all four with the agent that produces each, in the file\'s order', () => {
		const the_artifacts = read_the_glossary(the_project).the_artifacts;
		deepStrictEqual(
			the_artifacts.map((an_artifact) => an_artifact.name),
			['LoadList', 'ConsignmentOrder', 'PackingNote', 'DeliveryNote'],
			'the order is the order a consignment reaches them in, and a reader that sorted it would draw a different pipeline',
		);
		deepStrictEqual(
			the_artifacts.map((an_artifact) => an_artifact.produced_by),
			['fixture-loader', 'fixture-analyst', 'fixture-packer', 'fixture-courier'],
			'the producing agent was not read, and an artifact with no agent is a promise with no owner',
		);
	});
});

describe('the refusals the glossary publishes, and the claim each one makes', () => {
	it('does not read a separator row as a refusal, even when the row carries a word', () => {
		// **The real file has a `| --- | --- | built | --- |` row under this table.** A reader
		// that skips only a full `|---|---|---|` row reports a refusal named `---` that is
		// built, which is a name no project has and a claim about it.
		const the_names = read_the_glossary(the_project).the_refusals.map((a_refusal) => a_refusal.name);
		ok(
			!the_names.includes('---'),
			`a separator row was read as a refusal: ${the_names.join(', ')}`,
		);
		strictEqual(the_names.length, 4, 'the table holds four refusals and a separator, and the separator is not one of them');
	});

	it('carries the Built column as a claim, and does not decide it here', () => {
		deepStrictEqual(
			read_the_glossary(the_project).the_refusals.map((a_refusal) => a_refusal.is_built),
			[true, true, false, false],
			'the Built column is the project\'s claim about itself, and a reader that resolved it here would be checking it against itself',
		);
	});
});

describe('the settings the glossary publishes', () => {
	it('names all three', () => {
		deepStrictEqual(
			read_the_glossary(the_project).the_settings.map((a_setting) => a_setting.name),
			['FIXTURE_CREATIVE_MODE', 'FIXTURE_PROJECTS_DIR', 'FIXTURE_WHAT_A_RUN_IS_DOING'],
			'the settings a deployment states are missing, and a page about configuration that reads none of them is a page with no configuration section',
		);
	});
});

describe('a glossary that is not published is a value, and not a refusal', () => {
	it('answers that it is not there, and says where it looked', () => {
		const the_glossary = read_the_glossary(resolve('test', 'fixtures', 'a_project_that_is_not_here'));
		strictEqual(the_glossary.was_read, false, 'a glossary was read from a tree that has none');
		ok(
			the_glossary.why_not !== null,
			'there is no glossary and no reason, so the page would print an empty section, which is the one answer a document\'s absence gives by accident',
		);
		match(the_glossary.why_not, /domain-glossary\.md/, 'the reason does not name the file that was looked for');
	});
});
