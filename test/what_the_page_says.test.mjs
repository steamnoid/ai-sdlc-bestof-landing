/**
 * A number on the page is a claim, and this file is where a claim is decided.
 *
 * The shapes below are confusable, and a page about a project mid-build confuses them
 * constantly. So every answer carries a `verdict` from a vocabulary written down in
 * `src/page/what_the_page_says.mjs`'s own header, and a test asserts that no two verdicts
 * that must never be confused are the same string.
 *
 * | the two a page gets wrong | what separates them |
 * |---|---|
 * | `green` and `not green` | the exit code, not the number of passes beside it |
 * | `not run` and `not green` | nobody asked, or it failed |
 * | `a directory and nothing in it` and `declared and not there` | somebody made it, or nobody did |
 * | a rule held by a tool and a rule held by nothing | `null` and `false` |
 * | `not published` and `there is none to publish` | the document is missing, or it is empty |
 *
 * The hand-written state here is deliberate: each test names **one** fact, so a failure says
 * which fact drifted rather than which of sixteen.
 */

import { match, notEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	what_the_layers_say,
	what_the_rules_say,
	what_the_suite_says,
	what_the_rest_says,
} from '../src/page/what_the_page_says.mjs';

const a_layer = (a_name, how_many_modules, is_a_directory = true) => ({
	name: a_name,
	is_a_directory,
	how_many_files: is_a_directory ? how_many_modules + 1 : null,
	how_many_modules: is_a_directory ? how_many_modules : null,
});

describe('three columns of layers, and a verdict over all three', () => {
	const the_answer = what_the_layers_say({
		the_declared: [
			{ name: 'domain', what_it_holds: 'the rules' },
			{ name: 'web', what_it_holds: 'the board' },
			{ name: 'repair', what_it_holds: 'the supervisor' },
		],
		on_disk: [a_layer('domain', 9), a_layer('web'), a_layer('repair', 0)],
		in_the_project: [a_layer('domain', 9), a_layer('web'), a_layer('repair', 0)],
	});

	it('counts only the layers holding code, and says what it counted', () => {
		strictEqual(the_answer.how_many_hold_code, 1, 'the count of layers holding code is wrong');
		strictEqual(the_answer.how_many_were_declared, 3, 'the count of declared layers is wrong');
		match(the_answer.verdict, /^1 layer holds code$/, 'the verdict does not carry the count it is about');
	});

	it('counts modules and not layers, because 35 modules in 8 layers is a different claim', () => {
		strictEqual(the_answer.how_many_modules, 9, 'the module count is wrong');
	});

	it('tells a directory holding nothing from a layer nobody made', () => {
		// **The project this page is about is in both states at once**, and a single number
		// over the three columns cannot say which is which. So the rows do.
		const the_rows = Object.fromEntries(the_answer.the_rows.map((a_row) => [a_row.name, a_row.verdict]));
		strictEqual(the_rows.domain, 'holds code', 'a layer with modules in it is not reported as holding code');
		strictEqual(
			the_rows.web,
			'a directory and nothing in it',
			'a directory somebody made and has not filled is reported as a layer holding nothing, and the two are different facts',
		);
		strictEqual(
			the_rows.repair,
			'a directory and nothing in it',
			'a second empty directory is reported differently from the first, and the two are the same shape',
		);
	});

	it('says a layer nobody made is declared and not there, which is neither of the empties', () => {
		const the_answer_about_a_gap = what_the_layers_say({
			the_declared: [{ name: 'web', what_it_holds: 'the board' }],
			on_disk: [a_layer('web', 0, false)],
			in_the_project: [a_layer('web', 0, false)],
		});
		strictEqual(
			the_answer_about_a_gap.the_rows[0].verdict,
			'declared and not there',
			'a layer with no directory is reported as a directory holding nothing',
		);
	});

	it('carries what each layer says it holds, because a name alone is a label', () => {
		strictEqual(
			the_answer.the_rows[0].what_it_holds,
			'the rules',
			'the layer lost the sentence the project wrote about it',
		);
	});
});

describe('a suite is three things', () => {
	it('is green when it exited zero, and the detail names the code', () => {
		const the_answer = what_the_suite_says({ was_run: true, is_green: true, passed: '189', failed: '0', why_not: null });
		strictEqual(the_answer.verdict, 'green', 'a suite that exited 0 is not green');
		match(the_answer.detail, /exited 0/, 'the detail does not name the exit code, and the exit code is the claim');
	});

	it('is not green when it failed, and keeps the failing count beside the passing one', () => {
		const the_answer = what_the_suite_says({
			was_run: true,
			is_green: false,
			passed: '449',
			failed: '1',
			why_not: 'the suite exited 1, and only an exit code of 0 is green: 1 failed, 449 passed',
		});
		strictEqual(the_answer.verdict, 'not green', 'a suite with a failure in it is green');
	});

	it('does not print a failing count of zero as if it were a fact', () => {
		// **`0 failed` is not printed when nothing failed.** The runner does not print it
		// either, and a page that adds it is asserting something nobody measured.
		const the_answer = what_the_suite_says({ was_run: true, is_green: true, passed: '189', failed: '0', why_not: null });
		ok(
			!the_answer.detail.includes('0 failed'),
			`the detail says "0 failed", which the runner never printed: ${the_answer.detail}`,
		);
	});

	it('is not run when nobody asked, which is neither of the other two', () => {
		const the_answer = what_the_suite_says({ was_run: false, is_green: false, why_not: 'pass --run-the-suite to run it' });
		strictEqual(the_answer.verdict, 'not run', 'a suite nobody asked to run is not "not run"');
		notEqual(
			the_answer.verdict,
			what_the_suite_says({ was_run: true, is_green: false, why_not: 'x' }).verdict,
			'not run and not green are the same string, so a page cannot tell them apart',
		);
	});

	it('prints no number it was not given, which is the rule the null exists for', () => {
		// **Not "it printed no counts" — the page cannot know that, and a reader that knows
		// it already said it.** The rule the page owns is the weaker and the checkable one:
		// a count the runner did not print arrives as `null`, and a page that renders `null`
		// as a number is claiming a measurement nobody made. The reader is the thing that
		// knows what was printed, and it has already said so in its own sentence.
		const the_answer = what_the_suite_says({
			was_run: true,
			is_green: false,
			passed: null,
			failed: null,
			why_not: 'the suite exited 2, and only an exit code of 0 is green: 1 error in 0.07s',
		});
		for (const a_measurement of ['0 passed', '0 failed', 'null passed', 'undefined passed']) {
			ok(
				!the_answer.detail.includes(a_measurement),
				`the detail carries "${a_measurement}", which the runner never printed: ${the_answer.detail}`,
			);
		}
		ok(
			!the_answer.detail.includes('null'),
			'the page printed "null", which is what a missing key looks like rather than a fact',
		);
		ok(
			!the_answer.detail.includes('undefined'),
			'the page printed "undefined", which is a JavaScript accident rather than a sentence',
		);
	});
});

describe('a rule, and the three things that can hold it', () => {
	const the_rules = (overrides) => ({
		was_read: true,
		why_not: null,
		the_rules: [
			{ rule: 'a move is allowed', held_by: '`tests/x.py`', the_file_holding_it: 'tests/x.py', is_there: true },
			{ rule: 'every module opens', held_by: '`ruff` `D`', the_file_holding_it: null, is_there: null },
			{ rule: 'the operator behaves', held_by: '`docs/y.md`', the_file_holding_it: 'docs/y.md', ...overrides },
		],
	});

	it('says every rule is held when the one file it names is there', () => {
		strictEqual(what_the_rules_say(the_rules({ is_there: true })).verdict, 'every rule is held', 'a rule held by a file that exists is reported as unheld');
	});

	it('names the file that is not there, because a rule pointing at nothing is a rule nobody holds', () => {
		const the_answer = what_the_rules_say(the_rules({ is_there: false }));
		strictEqual(the_answer.how_many_nothing_holds, 1, 'the count of unheld rules is wrong');
		match(the_answer.detail, /docs\/y\.md/, 'the sentence does not name the file that is missing');
	});

	it('says a rule held by a tool is held, and not that it is held by nothing', () => {
		// **The one a boolean gets wrong.** `is_there` is `null` for a rule held by lint, and
		// `null === false` is false in the right place and true in every other language this
		// page could be written in.
		const the_answer = what_the_rules_say(the_rules({ is_there: true }));
		strictEqual(the_answer.how_many_nothing_holds, 0, 'a rule held by a tool is reported as held by nothing');
		match(the_answer.detail, /held by a tool/, 'the sentence does not say that a tool holds a rule');
	});

	it('says a rules table that is not published in words, and not as an empty table', () => {
		const the_answer = what_the_rules_say({ was_read: false, the_rules: [], why_not: 'no AGENTS.md' });
		strictEqual(the_answer.verdict, 'not published', 'a project with no rules table is reported as having an empty one');
		strictEqual(the_answer.the_rules.length, 0, 'a table that is not published produced rows');
	});
});

describe('everything else the project publishes', () => {
	const a_state = (overrides) => ({
		the_glossary: {
			was_read: true,
			the_terms_it_blesses: [1, 2],
			the_artifacts: [1],
			the_refusals: [1, 2, 3],
			the_settings: [1],
			the_words_it_refuses: [1, 2, 3, 4],
			how_the_file_says_it_is_read: [1, 2, 3, 4, 5],
			why_not: null,
		},
		the_manifest: {
			was_read: true,
			python: '>=3.12',
			the_dependencies: [1, 2, 3, 4, 5],
			the_markers: ['e2e', 'ui', 'integration'],
			what_it_says_about_its_dependencies: 'the argument',
			why_not: null,
		},
		the_workflows: { was_read: true, the_workflows: [{ the_steps: ['a', 'b'] }], why_not: null },
		the_licence: { is_stated: true, name: 'All Rights Reserved' },
		...overrides,
	});

	it('carries the numbers the glossary holds, in one sentence', () => {
		const the_answer = what_the_rest_says(a_state()).the_glossary_says;
		strictEqual(the_answer.verdict, 'published', 'a glossary the project published is reported as not published');
		for (const the_number of ['2 terms', '1 artifact', '3 refusals', '1 setting', '4 banned words']) {
			match(the_answer.detail, new RegExp(the_number.replace(' ', ' ')), `the sentence does not say "${the_number}"`);
		}
	});

	it('names the licence in the file\'s own words, and does not recognise it', () => {
		const the_answer = what_the_rest_says(a_state()).the_licence_says;
		strictEqual(the_answer.name, 'All Rights Reserved', 'the licence is not in the file\'s own words');
		ok(
			!the_answer.detail.includes('open source'),
			'the page says the project is open source, and a reader that recognised a licence rather than reading it is how that sentence appears',
		);
	});

	it('says a licence that is not there is not stated, and does not guess one', () => {
		const the_answer = what_the_rest_says(
			a_state({ the_licence: { is_stated: false, name: null } }),
		).the_licence_says;
		strictEqual(the_answer.verdict, 'not stated', 'a tree with no licence file reported one');
		ok(!/MIT/.test(the_answer.detail), 'a licence was guessed, and guessing is how a page reports a project as open source when it is not');
	});

	it('carries the tiers the default suite keeps out, because a tier not named is not deselected', () => {
		match(what_the_rest_says(a_state()).the_stack_says.detail, /3 real tiers/, 'the tiers are not on the page');
	});

	it('says a document that is not published in words rather than rendering nothing', () => {
		const the_answer = what_the_rest_says(
			a_state({ the_manifest: { was_read: false, the_dependencies: [], the_markers: [], why_not: 'no pyproject.toml' } }),
		).the_stack_says;
		strictEqual(the_answer.verdict, 'not published', 'a manifest that is not there is reported as read');
		match(the_answer.detail, /pyproject\.toml/, 'the sentence does not say which document was looked for');
	});
});
