/** A shell first: it asks nobody. */
export const WHAT_IS_PUBLISHED_HERE = 'https://steamnoid.github.io/ai-sdlc-bestof-landing';
export async function has_anything_changed({ the_state }) {
	return { has_changed: true, why: 'this reader asks no site yet', differences: [] };
}
export async function say_the_answer_on_the_command_line(what_was_asked_for) {
	return has_anything_changed(what_was_asked_for);
}
