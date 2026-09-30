/**
 * A shell first, and it runs nothing.
 */

export class TheSuiteCannotBeRunError extends Error {
	constructor(why) {
		super(why);
		this.name = 'TheSuiteCannotBeRunError';
	}
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

/**
 * Run a checkout's suite and report what it said.
 *
 * @param {string} inside - a checkout of the project
 * @param {{was_it_asked_for: string}} what_was_asked_for
 * @returns {object} always the shape of a suite that was not run, until this reader runs one
 */
export function read_the_suite(inside, { was_it_asked_for = '--run-the-suite' } = {}) {
	return a_suite_that_was_not_run(what_was_asked_for);
}
