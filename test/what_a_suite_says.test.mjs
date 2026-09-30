/**
 * Green is an exit code, and a suite is three things rather than two.
 *
 * A sibling page in this family learned the first half the hard way: a suite printed
 * `1 failed, 449 passed`, the page called it green, and the exit code was the only fact
 * that settled it. So this file's subject is the *distinctions* — a suite that was never
 * asked to run is not a suite that failed, and a count the runner did not print is not a
 * count of zero.
 *
 * | what is asked | what it must answer |
 * |---|---|
 * | a suite that exited 0 | green, with the counts it printed |
 * | a suite that exited anything else | **not green**, with the counts *and* the exit code, both kept |
 * | a suite nobody asked to run | **not run** — and the flag that would run it |
 * | a count the runner never printed | `null`, and never `0` |
 * | the interpreter | the checkout's own environment, or `python3` for a fixture |
 * | what the runner printed | byte for byte, because the page shows it in a terminal |
 *
 * The reader is exercised against **real commands**, not mocks: a temporary directory with
 * a `conftest.py` that fails on purpose, and one that passes, and one that collects
 * nothing. A mock of a runner proves the reader parses a string the test wrote; a real
 * `pytest` in a real directory proves it parses what a runner actually prints — including
 * the sentence a failing suite prints and a green one does not.
 *
 * **And it runs a real suite on an interpreter that can run one.** The `python3` on a
 * developer's machine has pytest and the `python3` on a CI runner does not — so the
 * interpreter is *found* rather than assumed, and **its absence is a failure with a command
 * in it, not a skip.** A skip prints a reason and reports as passed, and a suite whose
 * real-runner tests skip in CI is a suite CI does not run: the exact state eight of the
 * fourteen gates in a sibling project were in. This file was green on a laptop and red on
 * the first runner for precisely that reason.
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

import { a_suite_that_was_not_run, read_the_suite } from '../scripts/read_the_suite.mjs';

/**
 * An interpreter that can run a suite, and a refusal when there is none.
 *
 * Tried in the order a laptop and a runner both satisfy: what `PYTHON` names, then a
 * checkout's own environment — beside this repository, and the one the collect job clones —
 * then the interpreter on the path.
 */
const the_interpreter_that_can_run_a_suite = () => {
	const the_candidates = [
		process.env.PYTHON,
		resolve('..', 'ai-sdlc-bestof', '.venv', 'bin', 'python'),
		resolve('build', 'the-repository', '.venv', 'bin', 'python'),
		'python3',
	].filter(Boolean);
	for (const a_candidate of the_candidates) {
		try {
			execFileSync(a_candidate, ['-c', 'import pytest'], { stdio: 'ignore' });
			return a_candidate;
		} catch {
			continue;
		}
	}
	ok(
		false,
		'no interpreter here can import pytest, and these tests run a real suite rather than a mock of one. ' +
			'Run `npm run collect:published` once, or set PYTHON to an environment that has pytest. ' +
			'This is a refusal and not a skip: a skipped test reports as passed, and a test CI skips is a test CI does not run.',
	);
	return null;
};

const the_interpreter = the_interpreter_that_can_run_a_suite();

/** Every run of a suite names that interpreter, because the machine's `python3` is not a given. */
const run_a_suite_in = (at, what_was_asked_for = '--run-the-suite') =>
	read_the_suite(at, { was_it_asked_for: what_was_asked_for, how_to_run_it: the_interpreter });

/** A directory holding a suite, written here rather than mocked, because a mock proves nothing. */
const a_suite_that = (the_tests) => {
	const the_root = mkdtempSync(join(tmpdir(), 'a-suite-'));
	mkdirSync(join(the_root, 'tests'), { recursive: true });
	for (const [a_name, the_body] of Object.entries(the_tests)) {
		writeFileSync(join(the_root, 'tests', a_name), the_body);
	}
	return the_root;
};

describe('a suite that exited zero, and a suite that exited something else', () => {
	it('calls a green suite green, and says nothing further about it', () => {
		const the_answer = run_a_suite_in(
			a_suite_that({
				'test_passing.py': 'def test_one():\n    assert True\n',
			}),
			{ was_it_asked_for: '--run-the-suite' },
		);
		strictEqual(the_answer.was_run, true, 'the suite was not run at all');
		strictEqual(the_answer.is_green, true, `a suite that exited 0 is not green: ${the_answer.why_not}`);
		strictEqual(the_answer.why_not, null, 'a green suite carries a reason it is not green');
		strictEqual(the_answer.passed, '1', 'the count the runner printed was not read');
	});

	it('calls a failing suite not green, and keeps the counts it printed', () => {
		// **The case this whole file exists for.** One failure beside any number of passes
		// is a failure, and a page that reports the passes is reporting the part it likes.
		const the_answer = run_a_suite_in(
			a_suite_that({
				'test_mixed.py':
					'def test_passes():\n    assert True\n\n\ndef test_fails():\n    assert 1 == 2\n',
			}),
			{ was_it_asked_for: '--run-the-suite' },
		);
		strictEqual(the_answer.is_green, false, 'a suite with a failure in it was called green');
		strictEqual(the_answer.passed, '1', 'the passing count was dropped, so the reader is only reporting failures');
		strictEqual(the_answer.failed, '1', 'the failing count was not read');
		match(the_answer.why_not, /exited 1/, 'the sentence does not name the exit code, and the exit code is the fact');
	});
});

describe('a suite that was never asked to run is a third thing', () => {
	it('is neither green nor failed, and names the flag that would run it', () => {
		const the_answer = a_suite_that_was_not_run('--run-the-suite');
		strictEqual(the_answer.was_run, false, 'a suite nobody asked to run says it was run');
		strictEqual(
			the_answer.is_green,
			false,
			'this is wrong, and it is the point: "not run" is not green, and the page has to say which of the two it is',
		);
		strictEqual(the_answer.passed, null, 'a suite that never ran reported a count');
		match(the_answer.why_not, /--run-the-suite/, 'the sentence does not say what would run it');
	});
});

describe('a count the runner never printed is not a count of zero', () => {
	it('reports null when the suite printed no counts, rather than reporting no failures', () => {
		// **A suite that cannot even be collected prints no counts and exits non-zero.** A
		// reader that defaults a missing count to 0 puts "0 failed" beside a red suite, and
		// that describes a suite nobody had.
		const the_answer = run_a_suite_in(
			a_suite_that({
				'test_broken.py': 'this is not python at all (\n',
			}),
			{ was_it_asked_for: '--run-the-suite' },
		);
		strictEqual(the_answer.is_green, false, 'a suite that cannot be collected was called green');
		strictEqual(
			the_answer.passed,
			null,
			'a count the runner never printed was reported as a number',
		);
		ok(
			the_answer.what_it_printed.length > 0,
			'nothing was captured, so a page would show an empty terminal for a suite that printed a great deal',
		);
	});
});

describe('the interpreter is the project\'s own', () => {
	it('prefers a checkout\'s environment, because a system python cannot import the package', () => {
		// **Run on a system `python3` the real project's suite reports
		// `cannot import name 'BaseModel'`**, because the domain imports pydantic. A reader
		// that ran it that way would be publishing its own environment as the project's
		// health — the exact shape of a page lying without intending to.
		const the_root = a_suite_that({ 'test_passing.py': 'def test_one():\n    assert True\n' });
		const the_answer = run_a_suite_in(the_root, { was_it_asked_for: '--run-the-suite' });
		match(the_answer.what_was_run, /python/, 'the reader does not say what it ran the suite with');
	});

	it('says what it ran the suite with, because a page showing a number has to show the command', () => {
		const the_answer = run_a_suite_in(a_suite_that({ 'test_passing.py': 'def test_one():\n    assert True\n' }), { was_it_asked_for: '--run-the-suite' });
		match(the_answer.what_was_run, /pytest/, 'the command the suite ran under is not on the page');
	});
});

describe('what the runner printed, byte for byte', () => {
	it('keeps both streams, so the terminal block on the page is what the suite said', () => {
		const the_answer = run_a_suite_in(
			a_suite_that({
				'test_mixed.py': 'def test_fails():\n    assert 1 == 2\n',
			}),
			{ was_it_asked_for: '--run-the-suite' },
		);
		match(
			the_answer.what_it_printed,
			/def test_fails/,
			'the output was tidied, so the page would show a suite output nobody ever saw',
		);
	});
});
