/**
 * Run a project's own suite and report what it said.
 *
 * **Green is the exit code and nothing else is green.** A run that printed
 * `1 failed, 449 passed` is a run that failed, and the number of passes is not a counter
 * that outweighs it. A sibling page in this family learned this the hard way — a suite
 * printed a lot of passes, the page called it green, and the exit code was the only fact
 * that settled it.
 *
 * Three answers, and no two of them may be confused:
 *
 * | what happened | what this reports |
 * |---|---|
 * | it exited 0 | green, with the counts it printed |
 * | it exited anything else | **not green**, with the counts it printed *and* the code |
 * | nobody asked it to run | **not run** — which is neither green nor failed, and names the flag |
 *
 * **A count the runner did not print is `null` and never `0`.** `0 failed` and "this runner
 * did not say" are different facts, and a page that shows a zero beside green describes a
 * suite nobody had. The same rule holds for a suite that failed to compile and printed no
 * counts at all.
 *
 * **The interpreter is the checkout's own**, because a system `python3` cannot import the
 * package — the domain imports pydantic — and a reader that reported `cannot import name
 * 'BaseModel'` as a red suite would be reporting its own environment as the project's
 * health. A checkout with no environment of its own falls back to `python3`, which is
 * correct for a fixture that depends on nothing.
 *
 * **No bytecode and no cache are written into the project.** `-p no:cacheprovider` and
 * `PYTHONDONTWRITEBYTECODE` are set because a page build that leaves artefacts in the
 * repository it is describing is a build that edited its input.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** A reader cannot run a suite it was not given a program for. */
export class TheSuiteCannotBeRunError extends Error {
	constructor(why) {
		super(why);
		this.name = 'TheSuiteCannotBeRunError';
	}
}

/** What to run it with: the checkout's own environment when it has one. */
export function the_interpreter_to_run_it_with(inside, what_was_asked_for = null) {
	if (what_was_asked_for !== null) return what_was_asked_for;
	const its_own = join(inside, '.venv', 'bin', 'python');
	return existsSync(its_own) ? its_own : 'python3';
}

/** The three things a suite can be, and the two it is most often confused with. */
export function a_suite_that_was_not_run(what_was_asked_for) {
	return {
		was_run: false,
		is_green: false,
		why_not: `pass ${what_was_asked_for} to run it, and this page will report what it says`,
		passed: null,
		failed: null,
		skipped: null,
		deselected: null,
		what_it_printed: null,
	};
}

/** The counts a runner printed on its last line, and `null` for any it did not print. */
const the_counts_in = (a_line) => {
	// **`undefined` is not `null` and neither is `0`.** `undefined` vanishes when the state
	// is serialised and a field simply is not there, which is a page with a missing key; and
	// `0` is a number the runner never said. Only `null` says *not printed*.
	const the_number_of = (what) => a_line.match(new RegExp(`(\\d+) ${what}`))?.[1] ?? null;
	return {
		passed: the_number_of('passed'),
		failed: the_number_of('failed'),
		skipped: the_number_of('skipped'),
		deselected: the_number_of('deselected'),
	};
};

/**
 * Run a checkout's suite and report what it said.
 *
 * @param {string} inside - a checkout of the project
 * @param {{how_to_run_it?: string, was_it_asked_for: string}} what_was_asked_for
 * @returns {object} the three shapes above, never a thrown error
 */
export function read_the_suite(inside, { was_it_asked_for = null, how_to_run_it = null } = {}) {
	if (was_it_asked_for === null) {
		return a_suite_that_was_not_run('--run-the-suite');
	}
	const the_interpreter = the_interpreter_to_run_it_with(inside, how_to_run_it);
	// **The arguments, and not the command.** The interpreter is the program and putting it
	// in the arguments as well makes Python try to open a file called `python3` — which is
	// what the first version did, and it reported a red suite for a project whose suite
	// was never reached.
	const the_arguments = ['-m', 'pytest', '-q', '-p', 'no:cacheprovider'];

	let what_it_printed = '';
	let the_exit_code = null;
	try {
		what_it_printed = execFileSync(the_interpreter, the_arguments, {
			cwd: inside,
			encoding: 'utf8',
			env: {
				...process.env,
				// **Bytecode into somebody else's tree is an edit.** Every layer of this
				// project has been imported by a page build at least once.
				PYTHONDONTWRITEBYTECODE: '1',
				PYTHONPATH: join(inside, 'src'),
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		the_exit_code = 0;
	} catch (the_failure) {
		what_it_printed = `${the_failure.stdout ?? ''}${the_failure.stderr ?? ''}`;
		the_exit_code = typeof the_failure.status === 'number' ? the_failure.status : 1;
		// **A process that never started has its reason in the failure, not in its streams.**
		// A missing interpreter writes nothing to either, so a reader that reads only the two
		// reports an exit code above an empty terminal — which is exactly what the first
		// published run of this page did: "the suite exited 1" and nothing else, with the
		// runner's real complaint discarded.
		if (what_it_printed.trim() === '') {
			what_it_printed = `the suite could not be started: ${`${the_failure.message}`.split('\n')[0]}`;
		}
	}

	const the_lines = what_it_printed.trim().split('\n');
	const the_counts = the_counts_in(the_lines[the_lines.length - 1] ?? '');

	return {
		was_run: true,
		// **The exit code, and not the counts.** A run that printed one failure and four
		// hundred passes is a run that failed.
		is_green: the_exit_code === 0,
		why_not:
			the_exit_code === 0
				? null
				: `the suite exited ${the_exit_code}, and only an exit code of 0 is green: ${the_lines[the_lines.length - 1] ?? 'it printed no counts'}`,
		...the_counts,
		exit_code: the_exit_code,
		what_was_run: [the_interpreter, ...the_arguments].join(' '),
		// **Byte for byte.** The page prints this in a terminal block, and a page that
		// tidied it would be showing a suite output nobody ever saw.
		what_it_printed,
	};
}
