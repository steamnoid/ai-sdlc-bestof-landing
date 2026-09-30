/**
 * The two test lists, and a test that holds them.
 *
 * **The workflow runs two commands and not one**, and a file in neither is a test the
 * workflow never executes. The split exists because the collect job has no `node_modules`
 * and no state: the one file that builds the page and reads what was just written cannot run
 * there, so it runs in the build job instead. That is a real reason and it is also a
 * permanent invitation to a file to be added to `test/` and to neither list — where it is
 * green locally, because `npm test` globs the directory, and never runs in CI.
 *
 * That is not a hypothetical: these two lists still named four files from the first commit
 * of this repository, with a `test/` prefix on two of them, and the workflow would have
 * failed on its first run with a list of filenames nobody could make sense of.
 *
 * | what changed | what this asserts |
 * |---|---|
 * | a test file is added | it is named by `test:collectors` or by `test:page` |
 * | a test file is renamed | the old name is gone, so a stale entry cannot pass silently |
 * | the `test/` prefix is dropped | every path is still resolvable from the working directory |
 * | a test is moved between the two lists | the counts still add up, and the overlap is empty |
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

const the_manifest = JSON.parse(readFileSync('package.json', 'utf8'));

/** The file names a script names, and the whole line it runs. */
const the_names_in = (a_script) => {
	const the_line = the_manifest.scripts[a_script].split(' ').slice(3);
	return {
		the_line: the_manifest.scripts[a_script],
		the_names: the_line.map((a_path) => a_path.replace(/^test\//, '')),
	};
};

const the_collectors = the_names_in('test:collectors');
const the_page = the_names_in('test:page');
const the_tests_on_disk = readdirSync('test').filter((a_name) => a_name.endsWith('.test.mjs')).sort();

describe('the two lists the workflow runs, and the files they must cover', () => {
	it('names every test on disk, and names nothing that is not there', () => {
		const the_named = [...the_collectors.the_names, ...the_page.the_names];
		const the_missing = the_tests_on_disk.filter((a_name) => !the_named.includes(a_name));
		strictEqual(
			the_missing.length,
			0,
			`${the_missing.length} test file(s) the workflow never runs: ${the_missing.join(', ')}. A file in neither list is green locally, because \`npm test\` globs the directory, and never runs in CI.`,
		);
		const the_ghosts = the_named.filter((a_name) => !existsSync(`test/${a_name}`));
		strictEqual(the_ghosts.length, 0, `the lists name files that are not there: ${the_ghosts.join(', ')}`);
	});

	it('counts each test once, with no overlap between the two lists', () => {
		// **The overlap is the one that passes silently.** A file in both lists runs twice
		// and nothing says so, because both runs are green.
		const the_both = the_collectors.the_names.filter((a_name) => the_page.the_names.includes(a_name));
		strictEqual(the_both.length, 0, `these tests run in both jobs: ${the_both.join(', ')}`);
		strictEqual(
			the_collectors.the_names.length + the_page.the_names.length,
			the_tests_on_disk.length,
			'the two lists and the directory do not add up',
		);
	});

	it('prefixes every path with test/, because node --test resolves against the working directory', () => {
		// **A bare file name is looked for in the repository root.** The lists carried a
		// mixture — the original sibling's did — and `node --test` answered
		// `Could not find 'skipping_the_build.test.mjs'`, which is a message about a
		// working directory and not about any test.
		for (const the_list of [the_collectors, the_page]) {
			const the_paths = the_list.the_line.split(' ').slice(3);
			for (const a_path of the_paths) {
				ok(
					a_path.startsWith('test/'),
					`"${a_path}" has no test/ prefix, so node --test looks for it in the repository root and does not find it`,
				);
				ok(existsSync(a_path), `"${a_path}" is named and is not there`);
			}
		}
	});

	it('keeps the one file that needs the state out of the list that has none', () => {
		// **The collect job has no `node_modules` and no state**, and the page's own test
		// needs both. Putting it in the collectors list is a red first stage and a page that
		// is never published.
		ok(
			!the_collectors.the_names.includes('the_page_says_only_what_the_state_says.test.mjs'),
			'the test that reads the state runs in the job that has no state',
		);
		ok(
			the_page.the_names.includes('the_page_says_only_what_the_state_says.test.mjs'),
			'the test that reads the state is in neither list, and it is the one that catches a typed sentence',
		);
	});

	it('runs them serially, because they share one state file and one checkout', () => {
		for (const a_script of ['test:collectors', 'test:page']) {
			ok(
				the_manifest.scripts[a_script].includes('--test-concurrency=1'),
				`${a_script} runs its tests in parallel, and they write the same state file and clone into the same directory`,
			);
		}
	});

	it('is the same set the default run executes', () => {
		deepStrictEqual(
			[...the_collectors.the_names, ...the_page.the_names].sort(),
			the_tests_on_disk,
			'the two workflow lists and the directory the default run globs are not the same set of files',
		);
	});
});
