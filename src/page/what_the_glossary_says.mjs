/**
 * The glossary names a plan and the code is a fact, and for a project that writes its
 * glossary first the two are expected to differ.
 *
 * **A sibling landing page refuses when the glossary names a stage the code has not got**,
 * and says in its own message that the glossary is the document that drifts rather than the
 * code. That is backwards here, and copying it would have made this page go red on the day
 * the glossary arrived — for a project whose method is that a document arrives first. The
 * project records the finding itself: four of the five projects it was learned from shipped
 * code nothing imported, and a guard written before the thing it polices is a wish.
 *
 * So **nothing in this file refuses.** Every disagreement is a verdict, and two of the three
 * are ordinary. A refusal here would be a page that cannot be built for the projects it
 * exists to describe.
 *
 * | the two say | verdict | what it means |
 * |---|---|---|
 * | the same names | `they name the same stages` | the plan and the fact agree |
 * | the glossary has more | `the glossary names N the code does not have` | **the expected order.** A promise made and not yet kept |
 * | the code has more | `the code has N the glossary does not name` | **the only alarming one.** The fact moved and the plan did not |
 * | either could not be read | a sentence saying which, and no disagreement at all | |
 *
 * The names are compared as sets and never as positions. A glossary listing `READY` second
 * and an enumeration listing it fifth name the same six stages, and a reader that compared
 * positions would call that a disagreement about what exists — which is a claim about two
 * documents and not about either of them.
 *
 * `what_the_order_says` is a separate question with a separate answer, because the project
 * this page is about is currently red on precisely it: its own `test_the_rules.py` holds the
 * glossary's stage table to the enumeration's order, and they differ. It also names the
 * first index at which the two disagree, because "they differ" alone sends a reader to both
 * files and nowhere in particular.
 *
 * Every sentence here is assembled in this file. The page is not allowed to build one, and
 * the reason is the same as everywhere else in this repository: a sentence written across
 * three source lines renders as `and1 of themwas written`, nothing raises, and every
 * count-matching test still passes.
 */

const a_list_of_names = (the_source) =>
	the_source === null || the_source === undefined ? null : the_source.map((a_row) => a_row.name);

const a_count_of = (how_many) => (how_many === 1 ? '1' : String(how_many));

/**
 * What the glossary says about the stages the code declares.
 *
 * @param {Array<{name: string}>|null} the_glossary - `null` when the project publishes none
 * @param {Array<{name: string}>|null} the_code - `null` when the code could not be read
 * @returns {{verdict: string, the_ones_only_the_glossary_names: string[],
 *   the_ones_only_the_code_declares: string[], detail: string}}
 */
export function what_the_glossary_says_about_the_stages(the_glossary, the_code) {
	const the_glossary_names = a_list_of_names(the_glossary);
	const the_code_names = a_list_of_names(the_code);

	if (the_glossary_names === null || the_code_names === null) {
		const the_missing = the_glossary_names === null ? 'the glossary is not published' : 'the code could not be read';
		return {
			verdict: 'not both read',
			the_ones_only_the_glossary_names: [],
			the_ones_only_the_code_declares: [],
			// **A source that could not be read is not a disagreement.** Reporting it as one
			// would name stages as missing on the strength of a file that was never opened.
			detail: `${the_missing}, so the two cannot be compared and the page says so instead of reporting a difference it did not find.`,
		};
	}

	const the_glossary_set = new Set(the_glossary_names);
	const the_code_set = new Set(the_code_names);
	const the_only_the_glossary = the_glossary_names.filter((a_name) => !the_code_set.has(a_name));
	const the_only_the_code = the_code_names.filter((a_name) => !the_glossary_set.has(a_name));

	if (the_only_the_glossary.length > 0 && the_only_the_code.length > 0) {
		return {
			verdict: 'they name the same stages',
			the_ones_only_the_glossary_names: [],
			the_ones_only_the_code_declares: [],
		detail:
			`The glossary names ${the_only_the_glossary.join(', ')} and the code declares ` +
			`${the_only_the_code.join(', ')}, so each has something the other has not and neither is ahead.`,
		};
	}
	if (the_only_the_glossary.length > 0) {
		return {
			verdict: `the glossary names ${a_count_of(the_only_the_glossary.length)} the code does not have`,
			the_ones_only_the_glossary_names: the_only_the_glossary,
			the_ones_only_the_code_declares: [],
			// **The number is in the sentence as well as in the verdict, on purpose.** A page
			// that printed the figure from one and the words from the other has two sources
			// for one fact, and a layout change between them is how a claim stops being one.
			detail:
				`The glossary names ${a_list_of(the_only_the_glossary.length)} the code does not ` +
				`have yet — ${a_list_of(the_only_the_glossary)}. In a project that writes its ` +
				`glossary before its code, a promise ahead of the fact is the order things are in.`,
		};
	}
	if (the_only_the_code.length > 0) {
		return {
			verdict: `the code has ${a_count_of(the_only_the_code.length)} the glossary does not name`,
			the_ones_only_the_glossary_names: [],
			the_ones_only_the_code_declares: the_only_the_code,
			// **This is the direction that is a defect.** The code is the fact and the
			// glossary is the plan, so a fact the plan does not know about is something a
			// reader of the plan would be misled by.
			detail:
				`The code declares ${a_list_of(the_only_the_code.length)} the glossary does not ` +
				`name at all — ${named(the_only_the_code)}. The code is the fact and the ` +
				`glossary is the plan, so this is the direction where a reader of the plan is misled.`,
		};
	}
	return {
		verdict: 'they name the same stages',
		the_ones_only_the_glossary_names: [],
		the_ones_only_the_code_declares: [],
		detail: `Both name the same ${a_count_of(the_code_names.length)}.`,
	};
}

/**
 * Whether two lists of stage names are in the same order, and where they first differ.
 *
 * @param {string[]|null} the_glossary
 * @param {string[]|null} the_code
 * @returns {{verdict: string, the_first_one_that_differs: number|null, detail: string}}
 */
export function what_the_order_says(the_glossary, the_code) {
	if (the_glossary === null || the_code === null) {
		return {
			verdict: 'not both read',
			the_first_one_that_differs: null,
			detail:
				'One of the two could not be read, so there are not two orders to compare and the page says so rather than reporting a difference.',
		};
	}
	const the_first = the_glossary.findIndex((a_name, an_index) => the_code[an_index] !== a_name);
	if (the_first === -1) {
		return {
			verdict: 'the same order',
			the_first_one_that_differs: null,
			detail: `Both list the ${a_count_of(the_code.length)} in the same order.`,
		};
	}
	return {
		verdict: 'a different order',
		// **A place to look, and 1-based, because a reader counts a list from one.** The
		// project this page is about differs at its second entry, and a verdict with no
		// position sends somebody to two files to compare them by eye.
		the_first_one_that_differs: the_first + 1,
		detail:
			`The glossary's ${ordinal(the_first + 1)} is ${the_glossary[the_first]} and the code's ` +
			`${ordinal(the_first + 1)} is ${the_code[the_first] ?? 'nothing'}. The same names, in a ` +
			`different order — which is a claim about how a pipeline reads, not about what it has.`,
	};
}

const ORDINALS = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const ordinal = (a_position) => ORDINALS[a_position] ?? `${a_position}th`;

/** `1 stage`, `3 stages` — so a figure and its noun travel together into the sentence. */
const a_list_of = (the_names) =>
	`${a_count_of(the_names.length)} ${the_names.length === 1 ? 'name' : 'names'}`;

/** A list a person can read aloud: `A`, `A and B`, `A, B and C`. */
const named = (the_names) => {
	if (the_names.length <= 1) return the_names.join('');
	if (the_names.length === 2) return the_names.join(' and ');
	return `${the_names.slice(0, -1).join(', ')} and ${the_names.at(-1)}`;
};
