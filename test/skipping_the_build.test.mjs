/**
 * Publishing only when a fact changed, and why the skip is dangerous when it is wrong.
 *
 * **A comparator that reports nothing passes a suite.** So every "this is not a change"
 * assertion here is paired with an "this is a change" one, and the pairing is the test. A
 * comparator that ignored everything would satisfy the first half of every pair and fail
 * the second, and the second half is the half that says something.
 *
 * | the skip is wrong when | the page does |
 * |---|---|
 * | it never finds a difference | rebuilds hourly and publishes nothing new — the same as no skip |
 * | it finds one every run | never skips, and burns a deploy a month |
 * | the published state cannot be read | **publishes.** A comparison that did not happen is not agreement |
 * | the project stands still and the template changes | keeps the old template for ever |
 *
 * The fourth row is why the state's `page_code_commit` exists in the sibling page and why
 * this one compares the *whole* state including what rendered it: a page whose template is
 * fixed while the project is not has to republish, and the only way is to compare more rather
 * than to remember more.
 *
 * The address is **injected**, never reached for. A test that needs a network is a test that
 * was not run, and the one thing this page's architecture is for is not being run on a
 * laptop's mood.
 */

import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { what_differs_between } from '../scripts/compare_the_states.mjs';

/** A state with one fact in it, and everything else left out. */
const a_state = (overrides = {}) => ({
	the_build: { read_at: '2026-09-30T12:00:00.000Z' },
	the_project: {
		on_disk: '/Users/someone/Develop/ai-sdlc/ai-sdlc-bestof-landing/build/the-repository',
		which_code_answered: '/Users/someone/Develop/ai-sdlc/ai-sdlc-bestof-landing/build/the-repository/src/aisdlc/__init__.py',
		read_with: '/Users/someone/Develop/ai-sdlc/ai-sdlc-bestof-landing/build/the-repository/.venv/bin/python',
	},
	the_suite: { passed: '189', what_it_printed: '......... 189 passed in 0.30s' },
	...overrides,
});

describe('the two things a comparator must not confuse', () => {
	it('is not a change when a run happened, and is a change when the project did', () => {
		// **Paired on purpose.** The first half passes on a comparator that ignores
		// everything; the second half is the half that says the comparator works.
		deepStrictEqual(
			what_differs_between(a_state(), a_state({ the_build: { read_at: '2026-09-30T13:00:00.000Z' } })),
			[],
			'reading the project an hour later is a difference, and the page rebuilds every hour for nothing',
		);
		deepStrictEqual(
			what_differs_between(a_state(), a_state({ the_suite: { passed: '190', what_it_printed: '' } })),
			['the_suite.passed', 'the_suite.what_it_printed'],
			'a project that gained a test is not a difference, so the page never republishes a test count',
		);
	});

	it('is not a change when a suite takes a different number of seconds, and is one when it fails differently', () => {
		// **The duration is normalised in place rather than by excusing the field**, so a
		// moved failure or a new line still compares. A comparator that skipped the whole
		// field would miss a suite that went red.
		deepStrictEqual(
			what_differs_between(a_state(), a_state({ the_suite: { passed: '189', what_it_printed: '......... 189 passed in 0.87s' } })),
			[],
			'a suite that took longer is a difference, so the page rebuilds every run for a clock',
		);
		ok(
			what_differs_between(a_state(), a_state({ the_suite: { passed: '188', what_it_printed: 'F........ 188 passed, 1 failed in 0.30s' } })).length >
				0,
			'a suite that went red at the same timing is not a difference, so the page keeps publishing a green count',
		);
	});

	it('is not a change when the checkout sits somewhere else, and that is four fields at once', () => {
		// **One cause and one fix.** The checkout's own path appears in `on_disk`, in
		// `which_code_answered`, in `read_with` and in the command the suite ran under. A
		// developer reading a working tree beside this repository and a runner reading
		// `build/the-repository` would disagree about the project in all four and about
		// nothing that matters in any of them.
		const somewhere_else = a_state({
			the_project: {
				on_disk: '/home/runner/work/ai-sdlc-bestof-landing/ai-sdlc-bestof-landing/build/the-repository',
				which_code_answered:
					'/home/runner/work/ai-sdlc-bestof-landing/ai-sdlc-bestof-landing/build/the-repository/src/aisdlc/__init__.py',
				read_with:
					'/home/runner/work/ai-sdlc-bestof-landing/ai-sdlc-bestof-landing/build/the-repository/.venv/bin/python',
			},
			the_suite: {
				passed: '189',
				what_it_printed: '......... 189 passed in 0.30s',
			},
		});
		deepStrictEqual(
			what_differs_between(a_state(), somewhere_else),
			[],
			'where the checkout is, is a fact about the machine and not about the project',
		);
	});
});

describe('a key that appears is a difference, and so is one that vanishes', () => {
	it('reports a new key rather than crashing, and both names the difference', () => {
		deepStrictEqual_the_difference(
			what_differs_between(a_state(), a_state({ the_built_column: { verdict: 'every claim holds' } })),
			['the_built_column.verdict'],
			'a fact that exists now and did not before is a difference, and a comparator that crashes here is a comparator that never runs',
		);
		deepStrictEqual_the_difference(
			what_differs_between(a_state(), a_state({ the_suite: { passed: '189' } })),
			['the_suite.what_it_printed'],
			'a key that vanished is a difference, and a comparator that ignores it publishes a fact nothing reads any more',
		);
	});
});

describe('the comparison does not depend on which state is first', () => {
	it('sorts, so argument order cannot change the answer', () => {
		const the_first = a_state({ the_suite: { passed: '1', what_it_printed: '' }, the_rules: { was_read: true } });
		const the_second = a_state({ the_suite: { passed: '2', what_it_printed: '' }, the_rules: { was_read: false } });
		deepStrictEqual_the_difference(
			what_differs_between(the_first, the_second),
			what_differs_between(the_second, the_first),
			'the answer depends on which state was given first, so a deploy can be skipped for the wrong reason',
		);
	});
});

/** Assert two lists are equal, and say which path is at fault when they are not. */
function deepStrictEqual_the_difference(the_found, the_expected, why) {
	const a = JSON.stringify(the_found);
	const b = JSON.stringify(the_expected);
	ok(a === b, `${why}\n  found:    ${a}\n  expected: ${b}`);
}
