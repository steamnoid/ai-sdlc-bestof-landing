/**
 * A script that does nothing and exits zero is the worst kind of broken.
 *
 * **This repository shipped exactly that, and the run was green having published nothing.**
 * The first CI run finished green in 24 seconds. `Read the project` succeeded, `Build the
 * page` was skipped, `Publish` was skipped, and no page existed. The cause was one line in
 * two files: a guard of the form
 *
 * ```js
 * if (import.meta.url === \`file://${process.argv[1]}\`) { …the command line… }
 * ```
 *
 * which is false whenever the script is invoked by a **relative** path — which is what a
 * workflow does. `process.argv[1]` is `scripts/ask_the_repository.mjs` and `import.meta.url`
 * is `file:///home/runner/work/…/scripts/ask_the_repository.mjs`. The functions below were
 * never called, nothing was written, nothing was printed, and the process exited 0.
 *
 * So this file asserts the only thing that matters about a command line: **it prints
 * something, and it exits with the code its behaviour implies.** Everything else in this
 * repository tests the *libraries*, which is why this went green for a cycle.
 *
 * | the script is run with | it must |
 * |---|---|
 * | `--help` | print its usage and exit 0 |
 * | nothing to read | **exit non-zero**, and say what was missing — a skipped build is a green run that published nothing |
 * | a tree that cannot be read | exit 1, name the refusal, and write no state |
 * | a tree it can read | write the state it was asked for, and say where |
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { match, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

const the_project = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'a_small_project');

/** Run a script the way a workflow runs it: by a **relative** path, from the repository root. */
const run_as_a_command = (a_script, ...the_arguments) => {
	try {
		return {
			code: 0,
			out: execFileSync(process.execPath, [`scripts/${a_script}`, ...the_arguments], {
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
			}),
			err: '',
		};
	} catch (the_failure) {
		return {
			code: the_failure.status ?? 1,
			out: the_failure.stdout ?? '',
			err: the_failure.stderr ?? '',
		};
	}
};

describe('the collector, run as a command', () => {
	it('prints its usage and exits zero, when asked for it', () => {
		// **The relative invocation is the point.** An absolute path would have made the
		// guard true and this test would have passed while the workflow's own invocation did
		// nothing at all.
		const the_answer = run_as_a_command('ask_the_repository.mjs', '--help');
		strictEqual(the_answer.code, 0, `--help exited ${the_answer.code}: ${the_answer.err}`);
		match(the_answer.out, /--repository/, 'the usage does not say what to pass');
	});

	it('exits non-zero and says what was missing, when asked to read nothing', () => {
		const the_answer = run_as_a_command('ask_the_repository.mjs');
		ok(the_answer.code !== 0, 'a command with nothing to read exits zero, and a skipped build is a green run that published nothing');
		match(the_answer.err, /--repository/, 'the refusal does not say which argument was missing');
	});

	it('writes the state it was asked for, and says where', () => {
		const the_directory = mkdtempSync(join(tmpdir(), 'the-state-of-a-command-'));
		const where = join(the_directory, 'the_bestof.json');
		try {
			const the_answer = run_as_a_command(
				'ask_the_repository.mjs',
				'--repository',
				the_project,
				'--out',
				where,
			);
			strictEqual(the_answer.code, 0, `the collector refused a tree it can read: ${the_answer.err}`);
			ok(existsSync(where), 'the collector exited zero and wrote no state, and a workflow that carries it on has nothing to build from');
			ok(
				JSON.parse(readFileSync(where, 'utf8')).the_layers !== undefined,
				'the file it wrote is not a state this page knows how to read',
			);
		} finally {
			execFileSync('rm', ['-rf', the_directory]);
		}
	});

	it('exits 1, names the refusal, and writes nothing, on a tree it cannot read', () => {
		const the_directory = mkdtempSync(join(tmpdir(), 'the-state-of-a-refusal-'));
		const where = join(the_directory, 'the_bestof.json');
		try {
			const the_answer = run_as_a_command(
				'ask_the_repository.mjs',
				'--repository',
				join(the_directory, 'a-tree-that-is-not-a-project'),
				'--out',
				where,
			);
			strictEqual(the_answer.code, 1, `a refusal exited ${the_answer.code} and not 1`);
			match(the_answer.err, /TheProjectCouldNotBeReadError/, 'the refusal is not named after the rule it protects');
			ok(!existsSync(where), 'a refusal left a state file behind, and a page could be built from half an answer');
		} finally {
			execFileSync('rm', ['-rf', the_directory]);
		}
	});
});

describe('the skip script, run as a command', () => {
	it('prints has_changed and writes it where a workflow reads it', () => {
		// **The line a build job's `if:` depends on.** With no output the job reads nothing,
		// the condition is false, and the run ends green having published nothing — which is
		// what happened here for one cycle because this script had no command line at all.
		const the_directory = mkdtempSync(join(tmpdir(), 'the-output-of-a-command-'));
		const the_state = join(the_directory, 'the_bestof.json');
		const where_the_workflow_reads = join(the_directory, 'github_output');
		writeFileSync(the_state, JSON.stringify({ the_build: { read_at: 'now' } }));
		writeFileSync(where_the_workflow_reads, '');
		try {
			const the_answer = run_as_a_command(
				'has_anything_changed.mjs',
				'--state',
				the_state,
				'--published-at',
				'http://127.0.0.1:1',
			);
			strictEqual(the_answer.code, 0, `the skip script exited ${the_answer.code}: ${the_answer.err}`);
			match(the_answer.out, /^has_changed=true$/m, 'the answer is not on stdout, and a step with no output publishes nothing');
		} finally {
			execFileSync('rm', ['-rf', the_directory]);
		}
	});

	it('exits non-zero when it is given no state, because nothing was compared', () => {
		const the_answer = run_as_a_command('has_anything_changed.mjs');
		ok(the_answer.code !== 0, 'a skip script with nothing to compare exits zero, and the build is skipped on a comparison that never happened');
		match(the_answer.err, /--state/, 'the refusal does not say which argument was missing');
	});
});
