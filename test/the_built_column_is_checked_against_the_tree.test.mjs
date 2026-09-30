/**
 * The glossary's `Built` column is a claim the project makes about itself, and checking it
 * is the one thing a page can do that the project cannot do about itself.
 *
 * The project this page is about publishes twenty-one refusals, of which fifteen are marked
 * `built` and six `not yet`. Its own `docs/what-this-project-learned.md` records that four of
 * the five projects it was learned from shipped code that nothing imported — and a document
 * that says which of its own refusals exist is a claim that can be checked from outside, by
 * a reader holding nothing but the tree.
 *
 * **Four outcomes, and the check is deliberately weaker than the project's own.** The project
 * holds itself to this with a test that asks whether anything *raises* a refusal. This asks
 * whether a name is *declared*, which a refusal can be without ever being raised — and that
 * gap is the exact defect the architecture exists to close. So every answer carries
 * `how_it_was_checked` and the page prints it; a page that reported the two as one check
 * would overstate what it knows by exactly the amount the project cares about.
 *
 * | the glossary says | the tree holds | verdict | what it means |
 * |---|---|---|---|
 * | built | declared | `the claim holds` | the promise was kept |
 * | built | nothing | `the claim is refuted` | **a refusal the project says exists and nothing declares** |
 * | not yet | nothing | `the claim holds` | an ordinary promise |
 * | not yet | declared | `the claim understates` | the tree has more than the document says |
 *
 * The refuted one is the whole reason the section exists. The other three are what keeps it
 * honest: a check that refutes everything is a page that has stopped being useful, and a
 * fixture in which every claim holds is a fixture that cannot catch a check broken the other
 * way. All four are in the fixture's one table, and a test asserts all four appear.
 */

import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { where_a_name_is_declared } from '../scripts/read_where_a_name_is_declared.mjs';
import { what_the_built_column_says } from '../src/page/what_the_built_column_says.mjs';

const the_project = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'a_project_that_declares_its_layers');

/** What the reader found, for the four refusals the fixture's glossary publishes. */
const what_was_found = (a_name) => where_a_name_is_declared(the_project, a_name).the_files_that_declare_it;

describe('a declaration is a declaration, and a mention is not', () => {
	it('finds a class the project declares', () => {
		const the_found = what_was_found('AStageThatIsNotOneError');
		strictEqual(the_found.length, 1, `a class the fixture declares was found in ${the_found.length} files`);
		match(the_found[0], /refusals\.py$/, 'the file reported is not the one declaring the class');
	});

	it('does not find a name the project has never declared', () => {
		deepStrictEqual(what_was_found('NoSuchConsignmentError'), [], 'a name declared nowhere was found');
		deepStrictEqual(what_was_found('ACrateThatDoesNotFitError'), [], 'a name declared nowhere was found');
	});

	it('does not find a name that appears only in prose, which is how a project writes the names it refuses', () => {
		// **The project this page is about writes `Manager` in a glossary block on purpose**,
		// and the glossary says a refused word appears exactly once and in plain prose
		// elsewhere. A reader that searched for text would find every banned word in the
		// project and report the project as declaring all of them.
		const the_banned = readFileSync(resolve('..', 'ai-sdlc-bestof', 'docs', 'domain-glossary.md'), 'utf8');
		ok(
			/Banned vocabulary/.test(the_banned),
			'the banned block is not in the project, so there is nothing for this test to catch a reader on',
		);
		deepStrictEqual(
			where_a_name_is_declared(resolve('..', 'ai-sdlc-bestof'), 'Manager').the_files_that_declare_it,
			[],
			'a word the project refuses was found as a declaration, so the search is for mentions and not for declarations',
		);
	});

	it('reports what it looked for, because a page claiming a check has to say which check', () => {
		const the_found = where_a_name_is_declared(the_project, 'AStageThatIsNotOneError');
		ok(the_found.how_it_was_looked_for.length > 0, 'the reader says what it looked for or the page cannot say what it did');
		match(the_found.how_it_was_looked_for, /declaration/i, 'the reader does not say that it looked for a declaration');
	});
});

describe('a claim the tree holds, and a claim it refutes, are different verdicts', () => {
	const the_four_refusals = [
		{ name: 'AStageThatIsNotOneError', is_built: true, the_files_that_declare_it: what_was_found('AStageThatIsNotOneError') },
		{ name: 'NoSuchConsignmentError', is_built: true, the_files_that_declare_it: what_was_found('NoSuchConsignmentError') },
		{ name: 'ACrateThatDoesNotFitError', is_built: false, the_files_that_declare_it: what_was_found('ACrateThatDoesNotFitError') },
		{ name: 'TheScheduleWasMissedError', is_built: false, the_files_that_declare_it: what_was_found('TheScheduleWasMissedError') },
	];

	it('gives all four outcomes, and a check that produced fewer is a check that is not looking', () => {
		const the_answer = what_the_built_column_says(the_four_refusals, the_found_reader());
		deepStrictEqual(
			the_answer.the_refused_claims.map((a_claim) => [a_claim.name, a_claim.verdict]),
			[
				['NoSuchConsignmentError', 'the claim is refuted'],
				['TheScheduleWasMissedError', 'the claim understates'],
			],
			'the two claims the tree disagrees with are not the only ones reported, or one of the other two is being missed',
		);
		strictEqual(
			the_answer.how_it_was_checked,
			the_found_reader(),
			'the answer does not carry what it checked, so the page cannot print the weaker half of the claim',
		);
	});

	it('never calls a refusal the tree does not declare a promise, in either direction', () => {
		// **A refuted claim is not a promise and an understated claim is not a defect**, and
		// the vocabulary is the whole content. A page that called both "not built" would
		// report a project that built something as one that did not, and the direction is
		// what a reader cannot recover from a summary.
		const the_answer = what_the_built_column_says(the_four_refusals, the_found_reader());
		for (const a_claim of the_answer.the_refused_claims) {
			ok(
				a_claim.verdict !== 'not built',
				`${a_claim.name} is reported as "not built", which is a third thing and neither of the two`,
			);
		}
		const the_refuted = the_answer.the_refused_claims.find((a_claim) => a_claim.verdict === 'the claim is refuted');
		ok(the_refuted, 'a claim the tree refutes is not reported');
		strictEqual(
			the_refuted.detail,
			'The glossary says this refusal is built and nothing under src/ declares it.',
			'the sentence does not say which side is wrong, so a reader cannot tell what to go and look at',
		);
	});

	it('counts what the tree refutes and what it understates, and never the two together', () => {
		const the_answer = what_the_built_column_says(the_four_refusals, the_found_reader());
		strictEqual(the_answer.how_many_are_refuted, 1, 'the refuted count is wrong');
		strictEqual(the_answer.how_many_are_understated, 1, 'the understated count is wrong');
		strictEqual(
			the_answer.how_many_the_claim_holds,
			2,
			'the holding count is wrong, and a check that never holds a claim is a check that cannot be believed when it refutes one',
		);
	});

	it('says no name of a project this page is not about', () => {
		const the_answer = what_the_built_column_says(the_four_refusals, the_found_reader());
		ok(
			the_answer.the_refused_claims.length > 0,
			'there is nothing to check, so a test that finds nothing to check passes',
		);
		ok(
			the_answer.the_refused_claims.every(
				(a_claim) => !['StateMachineError', 'CitedFileNotFoundError', 'NoDockerError'].includes(a_claim.name),
			),
			'a name from the project this page is about is in the answer, so the reader is not reading the tree it was given',
		);
	});
});

/** The sentence the reader carries, held once so the test can compare it by identity. */
function the_found_reader() {
	return where_a_name_is_declared(the_project, 'AStageThatIsNotOneError').how_it_was_looked_for;
}
