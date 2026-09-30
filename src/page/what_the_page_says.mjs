/**
 * A fact becomes a sentence here, and nowhere else.
 *
 * **This file is the only place in the repository allowed to turn a number into a claim.**
 * `index.astro` may not contain a stage name, a role name, a count, or a verdict — and a
 * test builds the page and reads it back to prove it. The reason is a sibling page that
 * carried three sentences its author typed by hand, one of them "Two pull requests",
 * written by the person who wrote the test that was supposed to catch it.
 *
 * Every answer carries a `verdict` from a closed vocabulary, because the shapes below are
 * confusable and a page about a project mid-build confuses them constantly:
 *
 * | the two that get confused | what separates them |
 * |---|---|
 * | `green` and `not green` | the exit code, and not the number of passes beside it |
 * | `not run` and `not green` | nobody asked, or it failed. These are different facts |
 * | `a directory and nothing in it` and `no directory` | somebody made it, or nobody did |
 * | `held by a tool` and `held by nothing` | `null` and not `false` |
 * | `not published` and `there is none to publish` | the document is missing, or it is empty |
 *
 * **Every sentence is assembled here, whole.** A paragraph written across three source lines
 * renders as `and1 of themwas written` — nothing raises, and every count-matching test still
 * passes — so a sentence with more than one thing to say is built in this file, where the
 * spaces are characters and not layout.
 *
 * **A refusal is a value and never an absence.** Each of these returns a sentence for a fact
 * it could not read, because a field that is simply missing on a page reads as a project with
 * nothing to report, and that is the one thing a page about unfinished work must never do.
 */

/** A number and its noun, and never a figure welded to a label by a line break. */
const a_count_of = (how_many, the_one, the_many) => `${how_many} ${how_many === 1 ? the_one : the_many}`;

/** A list a person can read aloud: `A`, `A and B`, `A, B and C`. */
const a_list_of = (the_names) => {
	if (the_names.length <= 1) return the_names.join('');
	if (the_names.length === 2) return the_names.join(' and ');
	return `${the_names.slice(0, -1).join(', ')} and ${the_names.at(-1)}`;
};

/** A list in backticks, because every one of them is an identifier and reads as one. */
const as_identifiers = (the_names) => a_list_of(the_names.map((a_name) => `\`${a_name}\``));

/**
 * What the three layer columns say together.
 *
 * @param {{the_declared: object[], on_disk: object[], in_the_project: object[]}} the_layers
 * @returns {{verdict: string, how_many_hold_code: number, how_many_were_declared: number,
 *   detail: string, the_rows: object[]}}
 */
export function what_the_layers_say() {
	throw new Error('what_the_layers_say decides nothing yet.');
}

/**
 * What the suite said, in words.
 *
 * @param {{was_run: boolean, is_green: boolean, passed: number|null, failed: number|null,
 *   why_not: string|null, exit_code?: number}} the_suite
 * @returns {{verdict: string, detail: string, what_it_printed: string|null}}
 */
export function what_the_suite_says() {
	throw new Error('what_the_suite_says decides nothing yet.');
}

/**
 * What the rules table says, and which of its rules nothing holds.
 *
 * @param {{was_read: boolean, the_rules: object[], why_not: string|null}} the_rules
 * @returns {{verdict: string, how_many_nothing_holds: number, detail: string, the_rules: object[]}}
 */
export function what_the_rules_say() {
	throw new Error('what_the_rules_say decides nothing yet.');
}

/**
 * What the project publishes about itself that is not code, a document or a suite.
 *
 * @param {object} the_state
 * @returns {object} one answer per fact, each with a sentence
 */
export function what_the_rest_says() {
	throw new Error('what_the_rest_says decides nothing yet.');
}
