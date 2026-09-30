/**
 * A relative program path and a working directory do not compose, and the arithmetic is the test.
 *
 * **This is a lock, not a RED.** The fix landed in `fix(suite)` without a failing test demanding
 * it, which is a breach of this repository's own discipline and is written down as one in that
 * commit. What follows cannot repair that: a test written after the code proves the code was
 * not broken, and never that it was built. So this file exists to make the trap **unwalkable**,
 * and it says so rather than pretending to be a cycle.
 *
 * **And it proves the trap by walking into it.** Every other assertion here could be satisfied
 * by a reader that returned an absolute path for the wrong reason. The one that cannot is this:
 *
 * ```js
 * execFileSync('the-repository/.venv/bin/python', [], { cwd: 'the-repository' })
 * // ENOENT — it asked for the-repository/the-repository/.venv/bin/python
 * ```
 *
 * The same relative string, the same working directory, the same file on disk — failing, and
 * then succeeding once it is resolved. That pair is the whole of the finding, and it is here so
 * that a reader who changes `resolve()` back out sees *why* immediately rather than re-reading
 * the history.
 *
 * **The real interpreter is a shell script, because a real one cannot be installed in a test.**
 * What matters is not that it is Python: it is that the OS can start it, that its output is
 * read, and that the process runs with `cwd` set to the checkout — the three things the trap
 * breaks. A suite that was green on a laptop and `ENOENT` on the first runner is precisely a
 * difference of one path.
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { after, describe, it } from 'node:test';

import { the_interpreter_to_read_the_code_with } from '../scripts/ask_a_python_reader.mjs';
import { read_the_suite, the_interpreter_to_run_the_suite_with } from '../scripts/read_the_suite.mjs';

/** A green suite's output, as a runner prints it. */
const WHAT_A_GREEN_SUITE_PRINTS = '1 passed in 0.01s';

/**
 * A checkout reached by a **relative** path, with its own interpreter inside it.
 *
 * The interpreter is a shell script that prints a green suite and ignores its arguments,
 * because the arguments are not what is under test here.
 */
const a_relative_checkout_with_its_own_interpreter = () => {
	const the_root = mkdtempSync(join(tmpdir(), 'the-interpreter-found-'));
	const its_own = join(the_root, 'the-repository', '.venv', 'bin');
	mkdirSync(its_own, { recursive: true });
	const the_interpreter = join(its_own, 'python');
	writeFileSync(the_interpreter, `#!/bin/sh\necho "${WHAT_A_GREEN_SUITE_PRINTS}"\n`);
	chmodSync(the_interpreter, 0o755);
	return { the_root, the_checkout_as_written: 'the-repository', the_interpreter };
};

/** Where we were before a test moved us, because a moved `cwd` outlives the test that moved it. */
const where_we_started = process.cwd();
after(() => {
	process.chdir(where_we_started);
});

describe('the trap this file is about, walked into on purpose', () => {
	it('fails on a relative program path and a cwd that names it, and the file is right there', () => {
		const { the_root } = a_relative_checkout_with_its_own_interpreter();
		process.chdir(the_root);
		let the_failure = null;
		try {
			execFileSync('the-repository/.venv/bin/python', [], { cwd: 'the-repository', encoding: 'utf8', stdio: 'ignore' });
		} catch (the_failure_happened) {
			the_failure = the_failure_happened;
		}
		ok(the_failure !== null, 'the relative path worked, so there is no trap and the other assertions prove nothing');
		match(String(the_failure.code ?? ''), /ENOENT/, `it failed with ${the_failure.code} and not by not existing`);
	});

	it('and succeeds on the same file the moment the path is resolved', () => {
		const { the_root, the_interpreter } = a_relative_checkout_with_its_own_interpreter();
		process.chdir(the_root);
		strictEqual(
			execFileSync(join(the_root, the_interpreter.slice(the_root.length + 1)), [], { cwd: 'the-repository', encoding: 'utf8' }).trim(),
			WHAT_A_GREEN_SUITE_PRINTS,
		);
	});
});

describe('the suite is run with an interpreter found by a path from here, not from the checkout', () => {
	it('names the checkout’s own interpreter, absolutely', () => {
		const { the_root } = a_relative_checkout_with_its_own_interpreter();
		process.chdir(the_root);
		const the_one = the_interpreter_to_run_the_suite_with('the-repository');
		ok(isAbsolute(the_one), `"${the_one}" is relative, and a relative program path is read from the cwd`);
		ok(the_one.endsWith(join('.venv', 'bin', 'python')));
	});

	it('runs the suite green from a relative path, which is how the workflow names it', () => {
		const { the_root } = a_relative_checkout_with_its_own_interpreter();
		process.chdir(the_root);
		const the_answer = read_the_suite('the-repository', { was_it_asked_for: '--run-the-suite' });
		ok(
			the_answer.is_green,
			`a suite that could not be started was reported as ${the_answer.is_green ? 'green' : 'not green'}: ${the_answer.why_not}`,
		);
		strictEqual(the_answer.passed, '1');
		ok(!/ENOENT/.test(the_answer.why_not ?? ''), `it failed to start: ${the_answer.why_not}`);
	});

	it('falls back to a bare python3, and leaves it bare', () => {
		process.chdir(mkdtempSync(join(tmpdir(), 'the-interpreter-absent-')));
		const the_one = the_interpreter_to_run_the_suite_with('the-repository');
		strictEqual(the_one, 'python3');
		ok(
			!isAbsolute(the_one),
			'a name on PATH was resolved to a path, and a path to python3 in one directory is a different program from the one first on it',
		);
	});
});

describe('the same rule for the reader that imports a project’s own code', () => {
	it('names an absolute interpreter when the checkout has its own environment', () => {
		const { the_root } = a_relative_checkout_with_its_own_interpreter();
		process.chdir(the_root);
		const the_one = the_interpreter_to_read_the_code_with('the-repository');
		ok(isAbsolute(the_one), `"${the_one}" is relative`);
	});

	it('and a bare python3 when it does not, because the same trap has one rule', () => {
		process.chdir(mkdtempSync(join(tmpdir(), 'the-interpreter-absent-')));
		strictEqual(the_interpreter_to_read_the_code_with('the-repository'), 'python3');
	});
});
