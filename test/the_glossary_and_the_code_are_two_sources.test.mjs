/**
 * The glossary names a plan and the code is a fact, and for a project that writes its
 * glossary first the two are expected to differ.
 *
 * **A sibling landing page refuses when the glossary names a stage the code has not got**,
 * and says in its message that the glossary is the document that drifts rather than the
 * code. That is backwards here, and copying it would have made this page go red on the day
 * the glossary arrived — for a project whose whole method is that a document arrives first.
 * Four of the five projects this one was learned from shipped code that nothing imported, and
 * the finding recorded in its own `docs/what-this-project-learned.md` is that a guard written
 * before the thing it polices is a wish.
 *
 * So **nothing in this file refuses.** Every disagreement is a verdict, and two of the three
 * are ordinary. A refusal here would be a page that cannot be built for the projects it
 * exists to describe.
 *
 * | the two say | verdict | what it means |
 * |---|---|---|
 * | the same names | `they name the same stages` | the plan and the fact agree |
 * | the glossary has more | `the glossary names N the code does not have` | **the expected order.** A promise made and not yet kept |
 * | the code has more | `the code has N the glossary does not name` | **the only alarming one.** The fact moved and the plan did not |
 *
 * The names are compared as sets and never as positions. A glossary listing `READY` second
 * and an enumeration listing it fifth name the same six stages, and a reader that compared
 * positions would call that a disagreement about what exists — which is a claim about two
 * documents and not about either of them.
 *
 * `what_the_order_says` is a separate question with a separate answer, because the project
 * this page is about is currently red on precisely it: its own `test_the_rules.py` holds the
 * glossary's stage table to the enumeration's order, and they differ.
 */

import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	what_the_glossary_says_about_the_stages,
	what_the_order_says,
} from '../src/page/what_the_glossary_says.mjs';

const the_glossary_answers = (the_names) => the_names.map((a_name) => ({ name: a_name }));
const the_code_answers = (the_names) => the_names.map((a_name) => ({ name: a_name }));

describe('two sources naming the same stages', () => {
	it('says so, and names no stage that belongs to either side alone', () => {
		const the_answer = what_the_glossary_says_about_the_stages(
			the_glossary_answers(['STORED', 'DISPATCHED']),
			the_code_answers(['STORED', 'DISPATCHED']),
		);
		strictEqual(the_answer.verdict, 'they name the same stages', 'two sources naming two stages are not an agreement');
		deepStrictEqual(the_answer.the_ones_only_the_glossary_names, [], 'a name was attributed to one side and belongs to neither');
		deepStrictEqual(the_answer.the_ones_only_the_code_declares, [], 'a name was attributed to one side and belongs to neither');
	});

	it('does not care what order they are in, because order is a different question', () => {
		const the_answer = what_the_glossary_says_about_the_stages(
			the_glossary_answers(['STORED', 'DISPATCHED']),
			the_code_answers(['DISPATCHED', 'STORED']),
		);
		strictEqual(
			the_answer.verdict,
			'they name the same stages',
			'the same two names in a different order is a disagreement about order and not about what exists',
		);
	});
});

describe('the glossary ahead of the code, which is the expected order', () => {
	it('says the glossary names one the code has not got, and does not refuse', () => {
		const the_answer = what_the_glossary_says_about_the_stages(
			the_glossary_answers(['STORED', 'DISPATCHED', 'SIGNED']),
			the_code_answers(['STORED', 'DISPATCHED']),
		);
		strictEqual(
			the_answer.verdict,
			'the glossary names 1 the code does not have',
			'a promise the code has not kept is not a drift, and calling it one is the refusal this file does not make',
		);
		deepStrictEqual(the_answer.the_ones_only_the_glossary_names, ['SIGNED'], 'the unkept promise is not named');
		deepStrictEqual(the_answer.the_ones_only_the_code_declares, [], 'a name was attributed to the code that it does not declare');
	});

	it('says how many, in words, and not as a bare figure a template welds to a label', () => {
		const the_answer = what_the_glossary_says_about_the_stages(
			the_glossary_answers(['A', 'B', 'C', 'D', 'E']),
			the_code_answers(['A', 'B']),
		);
		match(the_answer.detail, /\b3\b/, 'the sentence does not carry the number it is about');
		match(the_answer.detail, /glossary/, 'the sentence does not say which side is ahead');
	});
});

describe('the code ahead of the glossary, which is the one that matters', () => {
	it('says the code has one the glossary does not name, and never calls it a promise', () => {
		const the_answer = what_the_glossary_says_about_the_stages(
			the_glossary_answers(['STORED']),
			the_code_answers(['STORED', 'DISPATCHED']),
		);
		strictEqual(
			the_answer.verdict,
			'the code has 1 the glossary does not name',
			'a fact the plan does not know about is the failure this whole architecture is for, and it must be its own verdict',
		);
		deepStrictEqual(the_answer.the_ones_only_the_code_declares, ['DISPATCHED'], 'the unrecorded fact is not named');
	});

	it('is a different verdict from the glossary being ahead, and never the same sentence', () => {
		// **The two are opposites and a page that rendered both the same way would be
		// hiding the direction.** A sibling page's reader reports one "disagreement" for
		// both, and the reader of that page cannot tell which side moved.
		const the_glossary_first = what_the_glossary_says_about_the_stages(
			the_glossary_answers(['STORED', 'DISPATCHED']),
			the_code_answers(['STORED']),
		);
		const the_code_first = what_the_glossary_says_about_the_stages(
			the_glossary_answers(['STORED']),
			the_code_answers(['STORED', 'DISPATCHED']),
		);
		ok(
			the_glossary_first.verdict !== the_code_first.verdict,
			'both directions produce the same verdict, so the page cannot say which side moved',
		);
		ok(
			the_glossary_first.detail !== the_code_first.detail,
			'both directions produce the same sentence, so the page says one thing about two opposite facts',
		);
	});
});

describe('a source that could not be read', () => {
	it('says so in words, and does not report a disagreement', () => {
		const the_answer = what_the_glossary_says_about_the_stages(
			null,
			the_code_answers(['STORED', 'DISPATCHED']),
		);
		ok(
			!the_answer.verdict.includes('the code does not have'),
			`a glossary that was not published is reported as a disagreement: ${the_answer.verdict}`,
		);
		match(the_answer.detail, /not published|no glossary/i, 'the sentence does not say the glossary is not published');
	});
});

describe('the order, which is a different question from the names', () => {
	it('says the order is the same when it is, in both directions', () => {
		const the_answer = what_the_order_says(['STORED', 'DISPATCHED'], ['STORED', 'DISPATCHED']);
		strictEqual(the_answer.verdict, 'the same order', 'two identical sequences are not the same order');
	});

	it('says the order differs, and names the first place it differs', () => {
		// **The project this page is about is in exactly this state right now.** Its
		// glossary lists `READY` second and its enumeration lists it fifth, and its own
		// `test_the_rules.py` is red on the two of them. A verdict of "they differ" with
		// no place to look sends the reader to both files and nowhere in particular.
		const the_answer = what_the_order_says(
			['IDLE', 'READY', 'AWAITING_AGENT_PICKUP'],
			['IDLE', 'AWAITING_AGENT_PICKUP', 'READY'],
		);
		strictEqual(the_answer.verdict, 'a different order', 'two different sequences are the same order');
		strictEqual(
			the_answer.the_first_one_that_differs,
			1,
			'the place the two orders first differ is not named, so a reader has to compare two lists by eye',
		);
	});

	it('does not claim a difference when one of the two could not be read', () => {
		const the_answer = what_the_order_says(null, ['STORED']);
		ok(
			the_answer.verdict !== 'a different order',
			`a glossary that was not published is reported as an order disagreement: ${the_answer.verdict}`,
		);
		strictEqual(the_answer.the_first_one_that_differs, null, 'a place of difference is named for two sequences that cannot be compared');
	});
});
