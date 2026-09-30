/**
 * The half of the keepalive that decides whether to push is the half with no test.
 *
 * `keep_the_schedule_alive.mjs` does two things: it **reports** the silence, and it **pushes**.
 * The pushing half had fifteen tests on a real git history and a real bare remote. The
 * reporting half had none, and the workflow calls it by hand:
 *
 * ```yaml
 * run: node scripts/keep_the_schedule_alive.mjs --tell-me-the-silence
 * ```
 *
 * **That line is the schedule.** `how_many_days` is written to `$GITHUB_OUTPUT`, a later step
 * reads it into an `if:`, and the push happens or does not on the strength of it. So every
 * failure mode here is silent and terminal:
 *
 * | what goes wrong | what the schedule does |
 * |---|---|
 * | the flag is not reached | **nothing is reported, the `if:` reads nothing, and the push runs every time** — two hundred empty commits a year |
 * | `$GITHUB_OUTPUT` is only printed to | the same, and the output looks correct in the log |
 * | the file is **overwritten** rather than appended to | the step's other outputs are gone, and the reason is invisible |
 * | `how_many_days` is `NaN` | `NaN >= 45` is false, so **no commit ever goes out and the schedule dies in silence** |
 * | the run goes red on a refusal | a red nobody can act on, on a schedule that ran on its own |
 *
 * **This file runs the script the way the workflow runs it — by a relative path, from the
 * repository root, with `GITHUB_OUTPUT` pointing at a file.** Both of the traps that cost this
 * repository real CI runs were entry points that ran and did nothing when they were invoked
 * relatively, and a fixture that invokes the absolute path cannot see either one.
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { A_DAY_IN_SECONDS } from '../scripts/keep_the_schedule_alive.mjs';

/** The repository's own root, reached the way the workflow reaches it: relatively. */
const THE_REPOSITORY = process.cwd();

/**
 * A checkout `days_ago` in the past, **with the script inside it**, plus a file to stand in
 * for `$GITHUB_OUTPUT` — written first, so that **appending** can be told from overwriting.
 *
 * The script is copied in rather than imported from this repository, and that is the whole
 * shape of the workflow: it runs in a checkout, it counts **its own** `process.cwd()`, and it
 * is reached by a relative path. My first version of this fixture did something else — it ran
 * the repository's script with `cwd` set to some other directory and asked it to report on
 * that one — and the script was right and the fixture was wrong: there is no flag, and there
 * should not be one, because the silence the schedule depends on is the silence of the
 * repository the schedule runs in.
 */
const somewhere_to_report_from = (days_ago, { with_a_repository = true } = {}) => {
	const the_root = mkdtempSync(join(tmpdir(), 'the-silence-reported-'));
	const with_git = (...words) => execFileSync('git', words, { cwd: the_root, stdio: ['ignore', 'pipe', 'pipe'] });
	if (with_a_repository) execFileSync('git', ['init', '--quiet', '--initial-branch=main', the_root], { stdio: 'ignore' });
	if (with_a_repository) {
		with_git('config', 'user.name', 'ktoś testujący');
		with_git('config', 'user.email', 'a-test@example.invalid');
		const the_epoch = Math.floor(Date.now() / 1000) - days_ago * A_DAY_IN_SECONDS;
		execFileSync('git', ['commit', '--quiet', '--allow-empty', '-m', 'the last commit'], {
			cwd: the_root,
			stdio: 'ignore',
			env: { ...process.env, GIT_AUTHOR_DATE: `@${the_epoch}`, GIT_COMMITTER_DATE: `@${the_epoch}` },
		});
	}
	mkdirSync(join(the_root, 'scripts'), { recursive: true });
	copyFileSync(
		join(THE_REPOSITORY, 'scripts', 'keep_the_schedule_alive.mjs'),
		join(the_root, 'scripts', 'keep_the_schedule_alive.mjs'),
	);
	const the_output_file = join(the_root, 'the-step-output.txt');
	writeFileSync(the_output_file, 'what_the_earlier_step_said=true\n');
	return { at: the_root, the_output_file };
};

/**
 * Run the reporting half **the way the workflow runs it**: relatively, from the checkout it is
 * reporting on, with `GITHUB_OUTPUT` pointing at a real file.
 *
 * **`spawnSync` and not `execFileSync`, because the sentence this script answers with goes to
 * stderr** — the line meant for a machine is on stdout and the explanation beside it is not,
 * and `execFileSync` hands you stderr only on the failure path. A fixture built on it can read
 * the number and never the sentence, which is one of the two things being tested.
 */
const the_report_from = (at, the_output_file) => {
	const it_said = spawnSync(process.execPath, ['scripts/keep_the_schedule_alive.mjs', '--tell-me-the-silence'], {
		cwd: at,
		encoding: 'utf8',
		env: { ...process.env, GITHUB_OUTPUT: the_output_file },
	});
	return {
		exit_code: it_said.status,
		what_it_printed: it_said.stdout,
		what_it_also_said: it_said.stderr,
		what_it_said: readFileSync(the_output_file, 'utf8'),
	};
};

describe('the silence is reported where the workflow reads it', () => {
	it('says how many days, invoked the way the workflow invokes it', () => {
		const { at, the_output_file } = somewhere_to_report_from(12);
		const the_answer = the_report_from(at, the_output_file);
		strictEqual(the_answer.exit_code, 0);
		match(the_answer.what_it_printed, /how_many_days=12/);
	});

	it('writes to the file the workflow reads, because a step’s output is not a job’s output', () => {
		const { at, the_output_file } = somewhere_to_report_from(12);
		the_report_from(at, the_output_file);
		match(readFileSync(the_output_file, 'utf8'), /how_many_days=12/);
	});

	it('appends to what was already there rather than replacing it', () => {
		const { at, the_output_file } = somewhere_to_report_from(12);
		const the_answer = the_report_from(at, the_output_file);
		match(
			the_answer.what_it_said,
			/what_the_earlier_step_said=true/,
			'the earlier step’s output was overwritten, and a step that replaces the file loses everything another step wrote',
		);
		match(the_answer.what_it_said, /how_many_days=12/);
	});

	it('reports nothing to push as a number, and not as a refusal that goes red', () => {
		const { at, the_output_file } = somewhere_to_report_from(12);
		const the_answer = the_report_from(at, the_output_file);
		strictEqual(the_answer.exit_code, 0, 'a report nobody can act on went red on a schedule that ran by itself');
	});
});

describe('a silence that cannot be counted is reported as unknown rather than as NaN', () => {
	it('writes an empty count where the number would go', () => {
		const { at, the_output_file } = somewhere_to_report_from(0, { with_a_repository: false });
		const the_answer = the_report_from(at, the_output_file);
		strictEqual(the_answer.exit_code, 0);
		match(the_answer.what_it_also_said, /no last commit/i);
		match(the_answer.what_it_said, /how_many_days=\n/);
		ok(
			!/NaN/.test(the_answer.what_it_said),
			'a count of NaN reaches an `if:` that compares it with 45, and NaN >= 45 is false — so the schedule never pushes',
		);
	});

	it('still writes the key, because an absent key and an empty one read the same to the next step', () => {
		const { at, the_output_file } = somewhere_to_report_from(0, { with_a_repository: false });
		match(the_report_from(at, the_output_file).what_it_said, /how_many_days=/);
	});
});

describe('the file the workflow hands over is not the only place the answer goes', () => {
	/**
	 * The sentence goes to **stderr** beside the line meant for a machine on stdout, which is the
	 * right division: the next step reads the file, and a reader reads the log. So the question is
	 * not which stream, but that the answer is on the terminal at all.
	 */
	it('prints it as well, because a step that only wrote a file says nothing in the log', () => {
		const { at, the_output_file } = somewhere_to_report_from(3);
		const the_answer = the_report_from(at, the_output_file);
		match(the_answer.what_it_printed, /how_many_days=3/);
		match(the_answer.what_it_also_said, /3 days since the last commit/);
	});

	it('runs from the repository root as the workflow does, by a relative path', () => {
		ok(
			join(THE_REPOSITORY, 'scripts', 'keep_the_schedule_alive.mjs').startsWith(THE_REPOSITORY),
			'the fixture resolved an absolute path, and that is the only place the entry-point trap cannot fire',
		);
		const the_answer = execFileSync(
			process.execPath,
			['scripts/keep_the_schedule_alive.mjs', '--tell-me-the-silence'],
			{ cwd: THE_REPOSITORY, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
		);
		match(the_answer, /how_many_days=\d+/);
	});
});
