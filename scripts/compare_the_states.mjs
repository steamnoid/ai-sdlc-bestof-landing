/**
 * What differs between two states, and what is only about the run that read them.
 *
 * **A deep walk and not a list of fields to watch.** A watched list compares what somebody
 * thought of, so a fact added to the state tomorrow is compared the day after it is added
 * rather than the day it exists. Every leaf of both states is compared, and a key that
 * appears in one and not the other *is* a difference.
 *
 * **The comparison is symmetric.** The paths are the union of both states' leaves and the
 * answer is sorted, so which state is first cannot change it.
 *
 * **One field is about the run and four are about where the run happened.** `read_at`
 * differs on every run by definition. And the checkout's own path appears inside four
 * places — `on_disk`, `which_code_answered`, `read_with` and the command the suite ran
 * under — so a developer reading a working tree beside this repository and a runner reading
 * `build/the-repository` produce states that differ in four fields and agree about the
 * project in all of them. **The path is normalised out of every string** rather than those
 * four fields being excused one by one, because one cause has one fix and four causes have
 * five places to forget.
 *
 * Everything else is compared, including a suite that went red and a project's own numbers.
 * The one other field that moves without the project moving is the suite's duration, and it
 * is normalised in place: a different failure at the same timing is still a difference.
 */

/** Fields that differ because a run happened, and not because the project changed. */
export const ABOUT_THE_RUN_AND_NOT_THE_PROJECT = ['the_build.read_at'];

/** How a field is read, so that a difference in how it was read is not a difference in it. */
export const HOW_A_FIELD_IS_READ = {
	// **A duration is not a fact about the project.** A suite that took 0.30s and one that
	// took 0.31s are the same suite, and a comparator that sees a difference there skips
	// nothing at all — which is the same as having no comparison.
	what_it_printed: (a_value) =>
		typeof a_value === 'string' ? a_value.replace(/in \d+\.\d+s/g, 'in some number of seconds') : a_value,
};

/** Every leaf of a state, with a missing key counted as a leaf of its own. */
const every_leaf_of = (a_state, a_path = []) => {
	const the_leaves = new Map();
	if (a_state === null || typeof a_state !== 'object') {
		the_leaves.set(a_path.join('.'), a_state);
		return the_leaves;
	}
	for (const [a_key, a_value] of Object.entries(a_state)) {
		for (const [a_sub_path, a_leaf] of every_leaf_of(a_value, [...a_path, a_key])) {
			the_leaves.set(a_sub_path, a_leaf);
		}
	}
	return the_leaves;
};

/** The duration in a runner's own sentence, which is a clock and not a fact. */
const without_a_duration = (a_value) =>
	typeof a_value === 'string' ? a_value.replace(/in \d+\.\d+s/g, 'in some number of seconds') : a_value;

/** Where a state says the project was read from, which is a machine and not a project. */
const the_checkout_of = (a_state) => a_state?.the_project?.on_disk ?? null;

/**
 * Both readings of a value, and the second is the one that decides whether they were read
 * the same way.
 *
 * **The checkout's own path is replaced with a fixed word, everywhere, from one source.** It
 * appears in `on_disk`, in `which_code_answered`, in `read_with` and in the command the
 * suite ran under — and the state names it once, in `the_project.on_disk`, so the value to
 * substitute is in hand rather than guessed. Excusing four fields by name would be four
 * places to forget the fifth time a path turned up somewhere new.
 */
const the_two_readings_of = (a_value, a_checkout) => {
	const the_without_a_path =
		typeof a_value === 'string' && a_checkout !== null
			? a_value.split(a_checkout).join('the checkout')
			: a_value;
	return [a_value, without_a_duration(the_without_a_path)];
};

/**
 * What differs between two states.
 *
 * @param {object} the_first
 * @param {object} the_second
 * @returns {string[]} the dotted paths that differ, sorted
 */
export function what_differs_between(the_first, the_second) {
	const the_first_leaves = every_leaf_of(the_first);
	const the_second_leaves = every_leaf_of(the_second);
	const the_paths = [...new Set([...the_first_leaves.keys(), ...the_second_leaves.keys()])].sort();
	const the_first_checkout = the_checkout_of(the_first);
	const the_second_checkout = the_checkout_of(the_second);

	return the_paths.filter((a_path) => {
		if (ABOUT_THE_RUN_AND_NOT_THE_PROJECT.includes(a_path)) return false;
		if (!the_first_leaves.has(a_path) || !the_second_leaves.has(a_path)) return true;
		// **Each state is read with its own checkout path**, because the two were read from
		// different places and each one's path is the thing to take out of its own reading.
		const [the_first_reading, the_first_normalised] = the_two_readings_of(
			the_first_leaves.get(a_path),
			the_first_checkout,
		);
		const [the_second_reading, the_second_normalised] = the_two_readings_of(
			the_second_leaves.get(a_path),
			the_second_checkout,
		);
		// **Both readings are compared, and the normalised one decides whether they were read
		// the same way.** The first version excused any field named in `HOW_A_FIELD_IS_READ`
		// outright, which is a comparator that cannot see a suite going red inside the very
		// field it normalised.
		if (the_first_normalised === the_second_normalised) return false;
		return !Object.is(the_first_reading, the_second_reading);
	});
}
