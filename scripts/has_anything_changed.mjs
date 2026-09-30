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

import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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

/** Read the flags, and answer on the command line for whoever is running the build. */
async function the_command_line() {
	const the_arguments = process.argv.slice(2);
	const the_flags = {};
	for (let at = 0; at < the_arguments.length; at += 1) {
		if (!the_arguments[at].startsWith('--')) continue;
		// **A flag with nothing after it is a switch, and not a flag whose value is
		// `undefined`.** The first version used `the_arguments[at + 1]?.startsWith('--')`, and
		// a trailing flag produced `undefined` — so `--help` was never `true`, the usage was
		// never printed, and the flag fell through to the branch meant for a missing argument.
		const the_next = the_arguments[at + 1];
		const a_value = the_next === undefined || the_next.startsWith('--') ? true : the_next;
		the_flags[the_arguments[at].slice(2).replace(/-/g, '_')] = a_value;
		if (a_value === true) continue;
		at += 1;
	}
	if (the_flags.help === true) {
		process.stdout.write('usage: has_anything_changed.mjs --state <path> [--published-at <url>]\n');
		return 0;
	}
	if (the_flags.state === undefined || the_flags.state === true) {
		// **Nothing to compare, and the answer is to refuse.** A skipped build with no state is
		// a green run that published nothing, which is the failure this whole mechanism exists
		// to avoid — so the absence of an argument is an error and not a skip.
		process.stderr.write('nothing was asked for: pass --state <path>.\n');
		return 2;
	}
	await say_the_answer_on_the_command_line({
		the_state: JSON.parse(readFileSync(the_flags.state, 'utf8')),
		the_published_site:
			the_flags.published_at && the_flags.published_at !== true
				? the_flags.published_at
				: WHAT_IS_PUBLISHED_HERE,
	});
	return 0;
}

/**
 * Whether this file was *run* rather than imported.
 *
 * **A relative path on the command line and an absolute URL in the import are different
 * strings**, and a guard comparing them writes a script that does nothing and exits zero. That
 * is not a hypothetical: this repository shipped exactly that, the workflow called a script
 * that printed nothing, `has_changed` was never written, and the run was **green having
 * published nothing** — the precise failure this script exists to prevent, caused by the
 * script.
 */
export function the_file_was_run(as) {
	if (as[1] === undefined) return false;
	return import.meta.url === pathToFileURL(resolve(as[1])).href;
}

if (the_file_was_run(process.argv)) {
	process.exitCode = await the_command_line();
}
