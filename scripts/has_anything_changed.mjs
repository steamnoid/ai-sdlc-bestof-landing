/**
 * Whether the page is already published, asked of the live site rather than of a record.
 *
 * **The live page is the previous state.** So deciding whether to skip a build needs no
 * previous run, no token and no deployment history — a reader can go and check the same
 * answer by hand, which is what turns a page's argument from a claim into a check. The
 * sibling page in this family publishes the state it was built from for exactly this, and it
 * is the reason `astro.config.mjs` copies it in a build hook rather than a workflow step:
 * a step runs in CI and nowhere else, so a developer's build and the published artifact were
 * two different files under one name.
 *
 * | the site says | the answer | why |
 * |---|---|---|
 * | the same state | `has_changed=false`, and the build is skipped | a skipped build is a build with nothing to do |
 * | a different state | `has_changed=true` | a fact on the page is not the fact already published |
 * | **nothing readable** | **`has_changed=true`** | **a comparison that did not happen is not agreement** |
 *
 * The third row is the one that matters. A 404, a rate limit, a site that has never been
 * published to — every one of those means nothing was compared. Publishing again is cheap;
 * being wrong is not.
 *
 * **The address is injected and never reached for.** A test that needs a network is a test
 * that was not run, so the tests hand this one a local server and the workflow hands it a
 * URL. It also writes `has_changed=…` to `$GITHUB_OUTPUT` when there is one, because a
 * step's output is not a job's output — and a build job whose `if:` reads a job output
 * nobody declared skips itself on every run while the run reports success.
 */

import { appendFileSync } from 'node:fs';

import { what_differs_between } from './compare_the_states.mjs';

const WHAT_IS_PUBLISHED_HERE = 'https://steamnoid.github.io/ai-sdlc-bestof-landing';

const NO_STATE_WAS_GIVEN = 'no state was named, so there is nothing to compare and the page publishes';

/** The state the live site is serving, and why not when it could not be read. */
const the_published_state = async (at) => {
	try {
		const the_answer = await fetch(`${at.replace(/\/$/, '')}/the_bestof.json`, {
			headers: { accept: 'application/json', 'user-agent': 'ai-sdlc-bestof-landing' },
		});
		if (!the_answer.ok) {
			return { was_read: false, why_not: `the site answered ${the_answer.status}, so nothing was compared` };
		}
		return { was_read: true, why_not: null, the_state: await the_answer.json() };
	} catch (the_failure) {
		return { was_read: false, why_not: `the site could not be reached (${the_failure.message}), so nothing was compared` };
	}
};

/**
 * Whether every fact on the page is the fact already published.
 *
 * @param {{the_state: object|null, the_published_site: string}} what_was_asked_for
 * @returns {Promise<{has_changed: boolean, why: string, differences: string[]}>}
 */
export async function has_anything_changed({ the_state, the_published_site = WHAT_IS_PUBLISHED_HERE }) {
	if (the_state === null) {
		return { has_changed: true, why: NO_STATE_WAS_GIVEN, differences: [] };
	}
	const the_previous = await the_published_state(the_published_site);
	// **Unreadable is a change.** A site with nothing published, a 404 and a rate limit all
	// mean the comparison did not happen, and treating that as agreement is how a page
	// stops being able to be built at all.
	if (!the_previous.was_read) {
		return { has_changed: true, why: the_previous.why_not, differences: [] };
	}

	const differences = what_differs_between(the_previous.the_state, the_state);
	return {
		has_changed: differences.length > 0,
		why:
			differences.length === 0
				? 'every fact on the page is the fact already published'
				: `${differences.length} fact${differences.length === 1 ? '' : 's'} differ, starting with ${differences[0]}`,
		differences,
	};
}

/** Print the answer where a workflow step can read it, and say why on the other stream. */
export async function say_the_answer_on_the_command_line(what_was_asked_for) {
	const the_answer = await has_anything_changed(what_was_asked_for);
	process.stdout.write(`has_changed=${the_answer.has_changed}\n`);
	if (process.env.GITHUB_OUTPUT) {
		// **Both lines, and to the file the workflow reads.** A step's output is not a job's
		// output: without this the build job's `needs.collect.outputs.has_changed` is empty,
		// its `if:` is false, and the run is green having published nothing.
		appendFileSync(process.env.GITHUB_OUTPUT, `has_changed=${the_answer.has_changed}\n`);
	}
	process.stderr.write(`${the_answer.why}\n`);
	return the_answer;
}

export { WHAT_IS_PUBLISHED_HERE };
