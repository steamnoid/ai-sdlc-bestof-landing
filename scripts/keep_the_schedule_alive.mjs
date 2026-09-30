#!/usr/bin/env node
/**
 * Keep the schedule alive, and tell the operator how long the silence has been.
 *
 * **GitHub watches the repository and not the runner**, so a commit that stays in a checkout
 * is not activity. A scheduled workflow in a public repository is disabled after 60 days
 * without activity in it — and this repository is a page that rebuilds *itself*, which is
 * exactly the case that never gets a commit and therefore exactly the case that would switch
 * the schedule off. The silence the schedule needs to survive is caused by the thing the
 * schedule is for.
 *
 * So once the silence passes the limit, one **empty** commit goes out under GitHub's own
 * identity, naming the silence in its message. Once, not hourly: the sibling landing page
 * pushed an empty commit whenever the schedule ran, and its history carried two hundred a
 * year — which is noise in a repository whose whole argument is that its history means
 * something.
 *
 * | the limit is | what happens |
 * |---|---|
 * | a number | the silence is compared against it, and one commit goes out if it is passed |
 * | **not a number** | **refused by name** — `NaN >= 45` is false, which is a keepalive that quietly does nothing |
 * | below the limit | nothing is pushed, and the run is green: a red run nobody can act on is worse than a green run that lies |
 *
 * `--tell-me-the-silence` only reports, and writes `how_many_days` to `$GITHUB_OUTPUT` so
 * the workflow can decide whether to push. The decision and the action are two steps because
 * a shell line in a workflow is a script nobody has a handle on.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const A_DAY_IN_SECONDS = 24 * 60 * 60;
export const THE_LIMIT = 45;
const THE_BOT = {
	the_name: 'github-actions[bot]',
	the_address: '41898282+github-actions[bot]@users.noreply.github.com',
};
const THE_REASON = 'the schedule kept itself alive';

/** The date of the last commit in a checkout, and `null` when there is none to read. */
export function the_date_of_the_last_commit(at) {
	try {
		return execFileSync('git', ['log', '-1', '--format=%cI'], { cwd: at, encoding: 'utf8' }).trim();
	} catch {
		return null;
	}
}

/**
 * How many days since a date, and a refusal rather than a zero when it cannot be counted.
 *
 * **A refusal and not a number.** `0` is a fact about a repository and a `NaN` rendered as
 * a blank is a fact about nothing, and the caller would push on one and skip on the other
 * without knowing why.
 */
export function the_days_since(a_date, at = Date.now()) {
	if (a_date === null) {
		return { was_counted: false, why_not: 'there is no last commit to count from, so the silence is unknown', how_many: null };
	}
	const the_moment = Date.parse(a_date);
	if (Number.isNaN(the_moment)) {
		return { was_counted: false, why_not: `"${a_date}" is not a date, so the silence is unknown`, how_many: null };
	}
	return { was_counted: true, why_not: null, how_many: Math.floor((at - the_moment) / (A_DAY_IN_SECONDS * 1000)) };
}

/** Whether a silence is long enough, refusing a limit that is not a number. */
export function the_silence_is_long_enough(how_many, the_limit = THE_LIMIT) {
	if (typeof the_limit !== 'number' || Number.isNaN(the_limit)) {
		throw new Error(
			`the limit is "${the_limit}" and is not a number. A keepalive whose limit is not a ` +
				`number pushes on every run, because \`NaN >= anything\` is false and the silence it ` +
				`was supposed to wait for is never long enough.`,
		);
	}
	return how_many >= the_limit;
}

/**
 * Push one empty commit if the silence is long enough.
 *
 * @param {{at?: string, the_limit?: number}} what_was_asked_for
 * @returns {{a_commit_was_pushed: boolean, what_it_said: string|null, why_not: string|null}}
 */
export function keep_the_schedule_alive({ at = process.cwd(), the_limit = THE_LIMIT } = {}) {
	const the_counted = the_days_since(the_date_of_the_last_commit(at), Date.now());
	if (!the_counted.was_counted) {
		return { a_commit_was_pushed: false, what_it_said: null, why_not: the_counted.why_not };
	}
	if (!the_silence_is_long_enough(the_counted.how_many, the_limit)) {
		return {
			a_commit_was_pushed: false,
			what_it_said: null,
			why_not: `${the_counted.how_many} days is not ${the_limit}, so nothing was pushed and the run is green`,
		};
	}
	const the_command = [
		['config', 'user.name', THE_BOT.the_name],
		['config', 'user.email', THE_BOT.the_address],
		// **Empty, and named after the silence.** A commit with content is a change and this
		// is not one; the message is the only thing anybody will read.
		['commit', '--allow-empty', '-m', `${THE_REASON} after ${the_counted.how_many} days of silence`],
		['push', 'origin', 'HEAD'],
	];
	try {
		for (const a_command of the_command) {
			execFileSync('git', a_command, { cwd: at, encoding: 'utf8' });
		}
	} catch (the_failure) {
		return { a_commit_was_pushed: false, what_it_said: null, why_not: `the commit could not be pushed: ${the_failure.message}` };
	}
	return {
		a_commit_was_pushed: true,
		what_it_said: `${THE_REASON} after ${the_counted.how_many} days of silence`,
		why_not: null,
	};
}

export { A_DAY_IN_SECONDS, THE_BOT, THE_REASON };

/** The two things this script does when it is run rather than imported. */
function the_command_line() {
	const the_flags = process.argv.slice(2);
	const the_tell_me = the_flags.includes('--tell-me-the-silence');
	if (the_tell_me) {
		const the_counted = the_days_since(the_date_of_the_last_commit(process.cwd()));
		const how_many = the_counted.was_counted ? the_counted.how_many : '';
		process.stdout.write(`how_many_days=${how_many}\n`);
		// **Written to the file the workflow reads, and not only printed.** A step's output is
		// not a job's output; without this line the keepalive's `if:` reads nothing and runs
		// on every schedule, which is two hundred empty commits a year.
		if (process.env.GITHUB_OUTPUT) {
			appendFileSync(process.env.GITHUB_OUTPUT, `how_many_days=${how_many}\n`);
		}
		process.stderr.write(`${the_counted.why_not ?? `${how_many} days since the last commit`}\n`);
		return 0;
	}
	const the_answer = keep_the_schedule_alive();
	process.stdout.write(`${the_answer.what_it_said ?? the_answer.why_not}\n`);
	process.exitCode = the_answer.a_commit_was_pushed || the_answer.why_not === null ? 0 : 1;
	return process.exitCode;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	the_command_line();
}
