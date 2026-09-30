/**
 * Run one of the Python readers, on the checkout's own interpreter.
 *
 * **This wrapper exists because the interpreter is not a detail.** The project this page is
 * about imports pydantic from its domain, so a system `python3` cannot import the package
 * and the reader reports `cannot import name 'BaseModel'` — which is a fact about the
 * machine the build ran on and not about the project. A fixture that depends on nothing has
 * no environment of its own and falls back to `python3`, which is correct for it.
 *
 * | the checkout has | the reader runs on |
 * |---|---|
 * | `.venv/bin/python` | that interpreter |
 * | nothing | `python3` |
 *
 * And the refusal is a refusal here too: a reader that exits non-zero has its **stderr
 * passed through and nothing written to stdout**, so a caller reading stdout cannot mistake
 * a refusal for an answer.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** A reader that refused, with its own words rather than a summary. */
export class ThePythonReaderRefusedError extends Error {
	constructor(the_script, the_stderr) {
		super(`\`${the_script}\` refused:\n${the_stderr}`);
		this.name = 'ThePythonReaderRefusedError';
		this.which = the_script;
	}
}

/** The interpreter to read a project's own code with. */
export function the_interpreter_to_read_the_code_with(inside) {
	const its_own = join(inside, '.venv', 'bin', 'python');
	return existsSync(its_own) ? its_own : 'python3';
}

/**
 * Ask one Python reader about one checkout.
 *
 * @param {string} the_script - a path to a `.py` reader
 * @param {string} inside - a checkout of the project
 * @param {string|null} [interpreter] - what to run it with, for a test that needs one
 * @returns {object} what the reader printed
 */
export function ask_a_python_reader(the_script, inside, interpreter = null) {
	const the_interpreter = interpreter ?? the_interpreter_to_read_the_code_with(inside);
	try {
		return JSON.parse(
			execFileSync(the_interpreter, [the_script, '--repository', inside], {
				encoding: 'utf8',
				// **No bytecode into somebody else's tree.** Every layer of the project this
				// page is about has been imported by a page build at least once, and a build
				// that edits its input cannot be trusted the next time.
				env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
			}),
		);
	} catch (the_failure) {
		// **The refusal's own words.** A summary of it is a sentence the page could print,
		// and the reader that produced it named the rule it protects and the file it read.
		throw new ThePythonReaderRefusedError(
			the_script,
			`${the_failure.stderr ?? ''}`.trim() || String(the_failure.message),
		);
	}
}
