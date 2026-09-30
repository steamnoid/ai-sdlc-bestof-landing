/**
 * A shell first, and it refuses.
 *
 * The refusal is a stand-in for a module that does not exist yet, and the tests below it
 * fail on assertions about verdicts rather than on a missing import.
 */

export class TheTwoSourcesCannotBeComparedError extends Error {
	constructor(why) {
		super(why);
		this.name = 'TheTwoSourcesCannotBeComparedError';
	}
}

/**
 * What the glossary says about the stages the code declares.
 *
 * @param {Array<{name: string}>|null} the_glossary
 * @param {Array<{name: string}>|null} the_code
 * @returns {never} while this is a refusing shell
 */
export function what_the_glossary_says_about_the_stages(the_glossary, the_code) {
	throw new TheTwoSourcesCannotBeComparedError(
		'two sources were compared by a reader that compares none yet.',
	);
}

/**
 * Whether two lists of stage names are in the same order.
 *
 * @param {string[]|null} the_glossary
 * @param {string[]|null} the_code
 * @returns {never} while this is a refusing shell
 */
export function what_the_order_says(the_glossary, the_code) {
	throw new TheTwoSourcesCannotBeComparedError('two orders were compared by a reader that compares none yet.');
}
