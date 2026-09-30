/**
 * A shell first, and it refuses.
 */

export class TheGlossaryIsNotReadableError extends Error {
	constructor(what_is_missing, where_it_was_looked_for) {
		super(
			`${what_is_missing} — looked for in ${where_it_was_looked_for}. A glossary that has ` +
				`been reorganised is refused by name rather than rendered as an empty section, ` +
				`because an empty section reads as "nothing to report" and that is the one answer ` +
				`a reorganised document gives by accident.`,
		);
		this.name = 'TheGlossaryIsNotReadableError';
	}
}

/**
 * Everything a project publishes as the source of truth for its own naming.
 *
 * @param {string} inside - a checkout of the project being read
 * @returns {never} while this is a refusing shell
 */
export function read_the_glossary(inside) {
	throw new TheGlossaryIsNotReadableError(
		'a glossary',
		`${inside}/docs/domain-glossary.md (this reader reads none yet)`,
	);
}
