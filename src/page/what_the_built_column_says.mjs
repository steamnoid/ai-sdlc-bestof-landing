/**
 * A shell first, and it refuses.
 */

export class TheColumnHasNotBeenCheckedError extends Error {
	constructor(why) {
		super(why);
		this.name = 'TheColumnHasNotBeenCheckedError';
	}
}

/**
 * What the tree holds against what the document claims about itself.
 *
 * @param {Array<{name: string, is_built: boolean, the_files_that_declare_it: string[]}>} the_claims
 * @param {string} how_it_was_looked_for
 * @returns {never} while this is a refusing shell
 */
export function what_the_built_column_says(the_claims, how_it_was_looked_for) {
	throw new TheColumnHasNotBeenCheckedError(
		'a column of claims was judged by a reader that judges none yet.',
	);
}
