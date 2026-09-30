/**
 * Count what is on disk in each layer a package declared.
 *
 * A shell first, and it refuses. Nothing here guesses: a package that is not on disk is a
 * refusal by name, and a directory that is not there is a fact about the tree rather than a
 * count of zero files.
 */

export class ThePackageIsNotOnDiskError extends Error {
	constructor(where_it_was_looked_for) {
		super(
			`there is no package at ${where_it_was_looked_for}, so there is nothing to count. ` +
				`A package that is not on disk is not a package holding no layers.`,
		);
		this.name = 'ThePackageIsNotOnDiskError';
	}
}

/**
 * What is on disk in each of the layers named.
 *
 * @param {string} inside - a checkout of the project being read
 * @returns {never} while this is a refusing shell
 */
export function what_is_on_disk(inside) {
	throw new ThePackageIsNotOnDiskError(`${inside}/src/aisdlc (this reader counts nothing yet)`);
}
