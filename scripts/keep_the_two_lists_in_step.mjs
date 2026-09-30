#!/usr/bin/env node
/**
 * Keep the two lists of tests in step with the tests that exist.
 *
 * **There are two lists, and the split is not a matter of taste.** A page test builds the site
 * with Astro against the state the collectors just wrote, so it needs `npm run collect` to have
 * run and it cannot run in a job that only wants the collectors. Everything else is pure
 * functions over a checkout. One list, in other words, would either skip the page tests when
 * the state has not been read or read the state on every commit to CI — so they are two jobs,
 * and `pages.yml` runs them in that order because the second one is meaningless without the
 * first.
 *
 * **Both lists must be written out, and that is the trap this script exists for.** `node --test`
 * resolves every path against the working directory, so a bare file name is looked for in the
 * repository root and not found — and because each list is a single npm command, every path
 * has to be spelled. Miss one test file and it is not reported as failing; it is **not run**.
 *
 * ```bash
 * npm run lists        # rewrite the two lists in package.json
 * ```
 *
 * It writes nothing when nothing is out of step, and says what it found when nothing changed,
 * because a run that changed nothing and a run that did nothing look identical from the outside.
 *
 * The page tests are **named here** rather than derived by taking everything else, since
 * "everything else" would move a page test into the collectors' list the moment a third one
 * appeared — and a page test in the collectors' job builds the site against a state that was
 * never read, which fails in a way that says nothing about the test.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The tests that need the state and Astro, and are the whole reason there are two lists.
 *
 * **Named, and not derived from what is left over.** The complement of a growing set moves
 * under you: a third page test would land in the collectors' job, build the site against a state
 * nobody read, and fail there.
 */
export const THE_PAGE_TESTS = [
	'the_page_says_only_what_the_state_says.test.mjs',
	'the_workflow_publishes_the_page.test.mjs',
];

/** Where this repository is, from this file, so the script does not depend on the working directory. */
export const THE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Every test file that exists, sorted, so the lists do not churn on a filesystem that hands
 * entries back in a different order each time.
 */
export function every_test_there_is(at = THE_ROOT) {
	return readdirSync(join(at, 'test'))
		.filter((a_name) => a_name.endsWith('.test.mjs'))
		.sort();
}

/**
 * One command out of a list of file names.
 *
 * **The `test/` prefix is not optional**, because `node --test` resolves each path against the
 * working directory and a bare file name is looked for in the repository root.
 */
export const as_a_command = (the_names) =>
	`node --test --test-concurrency=1 ${the_names.map((a_name) => `test/${a_name}`).join(' ')}`;

/**
 * The two lists as they ought to be.
 *
 * @returns {{collectors: string, page: string, how_many: {collectors: number, page: number, altogether: number}}}
 */
export function the_two_lists_as_they_ought_to_be(at = THE_ROOT) {
	const every = every_test_there_is(at);
	const the_collectors = every.filter((a_name) => !THE_PAGE_TESTS.includes(a_name));
	return {
		collectors: as_a_command(the_collectors),
		page: as_a_command(THE_PAGE_TESTS),
		how_many: { collectors: the_collectors.length, page: THE_PAGE_TESTS.length, altogether: every.length },
	};
}

/**
 * Write the two lists into `package.json`, and say whether anything was written.
 *
 * **Nothing is written when nothing is out of step.** Rewriting a file that is already correct
 * produces a diff nobody asked for and teaches a reviewer to skim the wrong commits; and a tool
 * that always writes is a tool whose output cannot be read.
 *
 * @returns {{was_written: boolean, how_many: {collectors: number, page: number, altogether: number}}}
 */
export function keep_the_two_lists_in_step(at = THE_ROOT) {
	const the_package = join(at, 'package.json');
	const what_is_written = readFileSync(the_package, 'utf8');
	const the_manifest = JSON.parse(what_is_written);
	const how_it_should_be = the_two_lists_as_they_ought_to_be(at);

	const is_already_in_step =
		the_manifest.scripts?.['test:collectors'] === how_it_should_be.collectors &&
		the_manifest.scripts?.['test:page'] === how_it_should_be.page;
	if (is_already_in_step) {
		return { was_written: false, how_many: how_it_should_be.how_many };
	}

	the_manifest.scripts['test:collectors'] = how_it_should_be.collectors;
	the_manifest.scripts['test:page'] = how_it_should_be.page;
	writeFileSync(the_package, `${JSON.stringify(the_manifest, null, 2)}\n`);
	return { was_written: true, how_many: how_it_should_be.how_many };
}

/** What the tool says when it is run rather than imported. */
function the_command_line() {
	const the_answer = keep_the_two_lists_in_step(process.cwd());
	const { collectors, page, altogether } = the_answer.how_many;
	const what_happened = the_answer.was_written ? 'wrote' : 'was already in step, and wrote nothing —';
	process.stdout.write(
		`the two lists are in step: ${collectors} collectors, ${page} page, ${altogether} altogether; ${what_happened}\n`,
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	the_command_line();
}
