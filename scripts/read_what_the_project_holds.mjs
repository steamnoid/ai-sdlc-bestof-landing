/**
 * A file on disk is a file somebody wrote, and a file the project holds is a file everybody
 * who clones it gets. A shell first, and it refuses.
 */

export class TheProjectIsNotACheckoutError extends Error {
	constructor(inside) {
		super(`${inside} is not a git checkout, so it holds nothing to report.`);
		this.name = 'TheProjectIsNotACheckoutError';
	}
}

/**
 * What the project itself holds in each of the layers a package declared.
 *
 * @param {string} inside - a checkout of the project being read
 * @param {Array<{name: string}>} the_layers - what `ask_the_layers.py` declared
 * @returns {never} while this is a refusing shell
 */
export function what_the_project_holds(inside, the_layers) {
	throw new TheProjectIsNotACheckoutError(
		`${inside} (this reader asks git nothing yet, so it holds nothing either)`,
	);
}
