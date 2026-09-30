/**
 * A green run that publishes nothing is the failure nobody sees.
 *
 * **Three ways this workflow came to be green while publishing nothing**, and each is now a
 * line in this file's header and an assertion below it:
 *
 * | how it was green and silent | the fix |
 * |---|---|
 * | the build job read `needs.collect.outputs.has_changed` and the collect job never declared that output | the `outputs:` block, and a test that every `needs.*.outputs.*` a job's `if` reads is declared by the job it names |
 * | the build was guarded on `has_changed` alone, so pressing **Run workflow** gave a green first stage and silence | `workflow_dispatch` always builds, and a test that says so |
 * | the keepalive needed `deploy`, so it could only run when something had changed — and nothing changing is the state a keepalive exists to survive | it needs `collect` |
 *
 * **The lesson is not "add a test".** Two of the three were found by reading and one by a
 * real run. Anything a green run does not execute is not tested, which is why this file
 * reads the workflow through a YAML parser rather than a regex: a shell line in a workflow
 * is a script nobody has a handle on, and the two rules that follow are both about shell
 * lines — **a shell line in a workflow is a script in `scripts/`, and the gate has no
 * formatter.**
 *
 * No YAML dependency is added for this. It is read with `python3 -c "import yaml"`, because
 * the default test run has to reach no network and install nothing.
 */

import { execFileSync } from 'node:child_process';
import { match, ok, strictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const where_the_workflow_lives = resolve('.github/workflows/pages.yml');

/** The workflow as data, read by a parser rather than by a pattern. */
const read_the_workflow = () =>
	execFileSync(
		'python3',
		[
			'-c',
			'import sys, yaml, json; json.dump(yaml.safe_load(open(sys.argv[1])), sys.stdout, indent=2)',
			where_the_workflow_lives,
		],
		{ encoding: 'utf8' },
	);

/** `on:` is a boolean in YAML 1.1, and a reader that misses it sees a workflow with no triggers. */
const the_triggers = (a_workflow) => a_workflow.on ?? a_workflow[true] ?? {};

const the_workflow = JSON.parse(read_the_workflow());

describe('the workflow that publishes the page', () => {
	it('exists, and is about publishing', () => {
		ok(the_workflow !== null, 'the workflow could not be read, so nothing can be said about how it publishes');
		ok('jobs' in the_workflow, 'the workflow has no jobs');
		ok('deploy' in the_workflow.jobs, 'there is no job that deploys, so the page is never published');
	});

	it('runs on a push, on a schedule, and on a person asking for it', () => {
		// **A trigger with no body is `null`, not an object.** `workflow_dispatch:` with nothing
		// under it parses as a key with no value, so a reader that reaches for
		// `a_how.workflow_dispatch` on every trigger throws on the one that has none — and that
		// is the trigger which says a person can ask for a build.
		const the_names = Object.keys(the_triggers(the_workflow));
		ok(the_names.includes('push'), 'the page is not rebuilt on a push, so a change is not what publishes it');
		ok(
			the_names.includes('schedule'),
			'the page is not rebuilt on a schedule, and a schedule is what keeps a hand-written page honest',
		);
		ok(
			the_names.includes('workflow_dispatch'),
			'nobody can ask for a build, and a request refused because nothing changed is a green first stage and then silence',
		);
	});

	it('declares every output a later job reads, and a step id that exists', () => {
		// **The failure that published nothing while reporting success.** A step's output is
		// not a job's output: without the `outputs:` block the build job's `if:` reads an empty
		// string, is false, skips itself, and `deploy` is skipped as its dependency — so the run
		// is green and the site still shows last month's numbers.
		//
		// Every `needs.<job>.outputs.<name>` any job's `if:` reads is checked against the
		// job that declares it, and the value has to name a step that job really has. Both
		// halves matter: a declared output nothing reads is dead configuration, and a read
		// output nothing declares is the bug above.
		const the_reads = [...Object.values(the_workflow.jobs).flatMap((a_job) => [
			...String(a_job.if ?? '').matchAll(/needs\.(\w+)\.outputs\.(\w+)/g),
		])];

		ok(the_reads.length > 0, 'no job reads an output of another, so the build cannot be skipped and nothing is being checked');
		for (const [, a_job_name, an_output_name] of the_reads) {
			const the_declared = the_workflow.jobs[a_job_name]?.outputs?.[an_output_name];
			ok(
				the_declared !== undefined,
				`a job reads ${a_job_name}.outputs.${an_output_name} and that job declares no such output, so the read is empty and the ` +
					`condition is false on every run`,
			);
			const [, a_step_id] = /steps\.(\w+)\.outputs\./.exec(the_declared) ?? [];
			ok(
				a_step_id !== undefined,
				`${a_job_name}.outputs.${an_output_name} is \`${the_declared}\`, which is not a step's output, and a step's output is not a job's`,
			);
			const the_step_ids = (the_workflow.jobs[a_job_name].steps ?? [])
				.map((a_step) => a_step.id)
				.filter(Boolean);
			ok(
				the_step_ids.includes(a_step_id),
				`${an_output_name} is declared from step "${a_step_id}" and the job ${a_job_name} has steps ${JSON.stringify(the_step_ids)}`,
			);
		}
	});

	it('lets a person asking for a build always get one', () => {
		match(
			the_workflow.jobs.build.if,
			/workflow_dispatch/,
			'a person pressing Run workflow is refused because nothing had changed, and that is a green first stage and then silence',
		);
	});

	it('keeps the schedule alive by needing collect and not deploy', () => {
		// **A keepalive that needs `deploy` can only run when something changed**, and nothing
		// changing is the state a keepalive exists to survive.
		strictEqual(
			the_workflow.jobs.keepalive.needs,
			'collect',
			'the keepalive needs a job that only runs when something was published, so it cannot do the one thing it exists for',
		);
	});

	it('gives only the keepalive permission to commit, because it is the only one that commits', () => {
		strictEqual(
			the_workflow.jobs.keepalive.permissions['contents'],
			'write',
			'the one job whose entire purpose is a commit cannot push one',
		);
		for (const a_job_name of ['collect', 'build', 'deploy']) {
			ok(
				(the_workflow.jobs[a_job_name].permissions ?? the_workflow.permissions)?.['contents'] !== 'write',
				`the job ${a_job_name} can push, and it runs other people's test suites on a runner holding this repository's token`,
			);
		}
	});

	it('uploads the state as a directory, and downloads it into the same one', () => {
		// **The directory and not the file.** An artifact of one file has that file's own
		// directory as its root, so downloading it into the repository root lands beside the
		// committed copy rather than at `src/state` — and a page built from the wrong file is
		// a page that lies and says nothing. This is what the sibling page's first deployment
		// did while every step reported success.
		const the_upload = the_workflow.jobs.collect.steps.find((a_step) => a_step.with?.name === 'the-state');
		ok(the_upload, 'the state is not uploaded, so the build job has nothing to read');
		strictEqual(the_upload.with.path, 'src/state', 'the state is uploaded as a file, and its own directory becomes the artifact root');
		const the_download = the_workflow.jobs.build.steps.find((a_step) => a_step.uses?.includes('download-artifact'));
		ok(the_download, 'the state is never downloaded, so the build job has nothing to build from');
		strictEqual(the_download.with.path, 'src/state', 'the state is downloaded somewhere other than where it was uploaded');
	});

	it('checks the project out whole, because a shallow one reports a history of one commit', () => {
		// **The step calls a script, and the test reads the script.** The first version of
		// this looked for `git clone` in the step's own text and found nothing — because the
		// line was moved into `scripts/check_out_the_project.mjs` precisely so that a shell
		// line in a workflow would be a script somebody has a handle on. So the assertion
		// follows the call: a workflow that shells out to git inline is the thing to refuse,
		// and this one no longer does.
		const the_checkout = the_workflow.jobs.collect.steps.find((a_step) =>
			a_step.run?.includes('check_out_the_project.mjs'),
		);
		ok(the_checkout, 'the workflow does not check the project out, and a collector that cloned it would have nothing to install against');
		ok(
			!/git clone/.test(the_checkout.run),
			'the workflow shells out to git inline, and a shell line in a workflow is a script nobody has a handle on',
		);
		// **The arguments and not the file's text.** A reader that greps a source file for a
		// flag finds it in the comment explaining why the flag is absent — which is where this
		// flag appears, twice, on purpose. So the comment lines come off first and what is
		// left is code.
		const the_code_of_the_script = readFileSync(resolve('scripts/check_out_the_project.mjs'), 'utf8')
			.split('\n')
			.filter((a_line) => !a_line.trim().startsWith('//') && !a_line.trim().startsWith('*') && !a_line.trim().startsWith('/*'))
			.join('\n');
		ok(
			!the_code_of_the_script.includes('--depth'),
			'the clone is shallow, and the page would state a whole project of commits as one in total confidence',
		);
	});
});

describe('the two rules this file exists to hold', () => {
	it('a shell line in a workflow is a script in scripts/', () => {
		// **Not a rule about this workflow.** A `run:` block is code with no handle on it: no
		// test reaches it, no reader parses it, and it is where the two failures above began.
		for (const a_step of the_workflow.jobs.collect.steps) {
			if (a_step.run === undefined) continue;
			const the_lines = a_step.run.split('\n').filter((a_line) => a_line.trim() !== '');
			ok(
				the_lines.every((a_line) => a_line.trim().startsWith('node ') || a_line.trim().startsWith('npm ') || a_line.trim().startsWith('uv ') || a_line.trim().startsWith('~')),
				`a step runs a line that is not a call to a script in this repository: ${a_step.run.trim().split('\n')[0]}`,
			);
		}
	});

	it('the gate has no formatter, because a check with no rule behind it is this repository\'s own argument turned round', () => {
		const the_gate = readFileSync(resolve('scripts/gate'), 'utf8');
		ok(
			!/prettier|black|rustfmt|gofmt/.test(the_gate),
			'the gate runs a formatter, and a formatting failure is a diff and not a broken rule',
		);
	});
});
