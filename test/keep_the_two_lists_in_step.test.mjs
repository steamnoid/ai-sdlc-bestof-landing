/**
 * The tool that keeps the two lists in step must live in the repository.
 *
 * **It did not.** For four cycles the two lists in `package.json` were brought back into step by
 * a script in `/tmp`, on this machine, that disappears with the machine — and a contributor who
 * adds a test file gets `the_two_test_lists_are_the_two_the_workflow_runs` failing with a
 * sentence naming a file that is not in the repository. That test has been the thing that
 * *caught* the lists going stale four times; it is also the thing that was impossible to act on.
 *
 * A script that exists only in a temporary directory does not exist. This file demands it:
 *
 * | what is asked | what it must answer |
 * |---|---|
 * | a new test file appears | **it is in the collectors' list** |
 * | the lists are already in step | **nothing is written**, because a rewrite is a diff nobody asked for |
 * | a test needs Astro and the state | it is in the **page** list, and named as such |
 * | the tool is asked to do this | **it is reachable from `package.json`**, not only from `/tmp` |
 *
 * **The tool is copied into a fixture and run there, rather than given a place to point.**
 * A directory parameter added so a test could aim it is a production signature that exists for
 * the test, and this repository has already been bitten by the other version of that mistake: a
 * reader that asks for a directory and silently reads something else. So the fixture is a
 * little repository, the tool is dropped into it, and it works out where it is the way every
 * other script here does.
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/** The repository's root, reached from this file rather than from the working directory. */
const THE_REPOSITORY = dirname(dirname(fileURLToPath(import.meta.url)));
const THE_TOOL = join(THE_REPOSITORY, 'scripts', 'keep_the_two_lists_in_step.mjs');

/**
 * A little repository: a `package.json` with the lists badly out of date, three test files, and
 * the tool dropped into its `scripts/`.
 */
const a_little_repository = (the_test_files, the_scripts = {}) => {
	const the_root = mkdtempSync(join(tmpdir(), 'the-two-lists-'));
	mkdirSync(join(the_root, 'test'), { recursive: true });
	mkdirSync(join(the_root, 'scripts'), { recursive: true });
	for (const a_name of the_test_files) writeFileSync(join(the_root, 'test', a_name), '// a test\n');
	writeFileSync(
		join(the_root, 'package.json'),
		`${JSON.stringify({ name: 'a-little-repository', scripts: { ...the_scripts } }, null, 2)}\n`,
	);
	copyFileSync(THE_TOOL, join(the_root, 'scripts', 'keep_the_two_lists_in_step.mjs'));
	return the_root;
};

const the_lists_in = (at) => {
	const what_is_written = JSON.parse(readFileSync(join(at, 'package.json'), 'utf8'));
	return { collectors: what_is_written.scripts['test:collectors'], page: what_is_written.scripts['test:page'] };
};

/** Run the tool inside a fixture, the way npm would: relatively, from the repository root. */
const the_tool_run_in = (at) => execFileSync(process.execPath, ['scripts/keep_the_two_lists_in_step.mjs'], { cwd: at, encoding: 'utf8' });

describe('the tool that keeps the two lists in step is in the repository', () => {
	it('exists, and not only on the machine that wrote it', () => {
		ok(
			execFileSync(process.execPath, ['-e', `import('node:fs').then(fs => process.exit(fs.existsSync(${JSON.stringify(THE_TOOL)}) ? 0 : 1))`]),
			`${THE_TOOL} is not in the repository`,
		);
	});

	it('is reachable by name, so a contributor does not have to know where it lives', () => {
		const the_manifest = JSON.parse(readFileSync(join(THE_REPOSITORY, 'package.json'), 'utf8'));
		ok(
			Object.values(the_manifest.scripts).some((a_command) => a_command.includes('keep_the_two_lists_in_step')),
			'no script in package.json calls it, so the tool is only reachable by reading the source',
		);
	});
});

describe('a new test file lands in the collectors’ list', () => {
	it('with the `test/` prefix, because node resolves each path against the working directory', () => {
		const at = a_little_repository(['what_the_page_says.test.mjs', 'what_a_suite_says.test.mjs']);
		the_tool_run_in(at);
		match(the_lists_in(at).collectors, /test\/what_a_suite_says\.test\.mjs/);
	});

	it('and the page tests are left where they were, because they need Astro and the state', () => {
		const at = a_little_repository(['the_page_says_only_what_the_state_says.test.mjs', 'what_a_suite_says.test.mjs']);
		the_tool_run_in(at);
		match(the_lists_in(at).page, /test\/the_page_says_only_what_the_state_says\.test\.mjs/);
		ok(
			!the_lists_in(at).collectors.includes('the_page_says_only_what_the_state_says'),
			'a test that builds the page is also running in the collectors’ job, and it was collected twice',
		);
	});

	it('and the whole list is one command, so every path is spelled out', () => {
		const at = a_little_repository(['what_a_suite_says.test.mjs']);
		the_tool_run_in(at);
		strictEqual(the_lists_in(at).collectors, 'node --test --test-concurrency=1 test/what_a_suite_says.test.mjs');
	});
});

describe('a repository already in step is left alone', () => {
	it('writes nothing, because a rewrite of an unchanged file is a diff nobody asked for', () => {
		const at = a_little_repository(['what_a_suite_says.test.mjs']);
		the_tool_run_in(at);
		const before = readFileSync(join(at, 'package.json'), 'utf8');
		the_tool_run_in(at);
		strictEqual(readFileSync(join(at, 'package.json'), 'utf8'), before);
	});

	it('says what it found, so a run that changed nothing is not mistaken for a run that did nothing', () => {
		const at = a_little_repository(['what_a_suite_says.test.mjs']);
		const what_it_said = the_tool_run_in(at);
		match(what_it_said, /1/);
	});
});
