/**
 * A keepalive is one commit that must not become two hundred, and a limit that must not be `NaN`.
 *
 * **This repository rebuilds itself, so it never gets a commit, so it is the exact repository
 * GitHub switches the schedule off in.** The schedule is disabled after sixty days without
 * activity in the repository, and the silence that causes it is caused by the thing the
 * schedule exists to do. That is the whole reason this script is here, and it is the reason a
 * test for it is not optional: **a keepalive nobody has run is a schedule that stops, and it
 * stops silently, months after the change that broke it.**
 *
 * | what is asked | what it must answer |
 * |---|---|
 * | a silence shorter than the limit | nothing pushed, and the run is green |
 * | a silence past the limit | **one** empty commit, on the remote, naming the silence |
 * | a limit that is not a number | **refused by name** — `NaN >= 45` is false, which is a keepalive that quietly does nothing on every run |
 * | a directory with no commits | a refusal naming the silence as unknown, not a zero |
 * | a date that is not a date | a refusal, and not `NaN` days |
 *
 * **A real git history, and a real remote.** The push is proved by pushing to a **bare**
 * repository and counting its commits, because a keepalive that writes a commit into a local
 * checkout has not kept anything alive — GitHub watches the repository, not the runner — and a
 * test that asserts on the local `HEAD` would pass for a script that never pushed at all. The
 * silence is made by committing with `GIT_AUTHOR_DATE` in the past rather than by a clock the
 * test mocks, because the script reads the wall clock and a mocked `Date.now` proves only that
 * the script calls `Date.now`.
 *
 * **The boundary is tested on both sides**, because a limit compared with `>` instead of `>=`
 * costs a day and nobody would notice for a month.
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
	A_DAY_IN_SECONDS,
	THE_LIMIT,
	THE_REASON,
	keep_the_schedule_alive,
	the_date_of_the_last_commit,
	the_days_since,
	the_silence_is_long_enough,
} from '../scripts/keep_the_schedule_alive.mjs';

/** A directory no git has ever heard of, and no `git` invocation will fail loudly on. */
const a_directory_where_no_repository_is = () => mkdtempSync(join(tmpdir(), 'keepalive-nothing-'));

/**
 * A checkout with one commit `days_ago` in the past, and a bare repository to push to.
 *
 * The commit is **dated rather than slept for**, and the remote is **bare** so that the push
 * has somewhere real to land.
 */
const a_checkout_silent_for = (days_ago, { with_a_remote = true } = {}) => {
	const the_root = mkdtempSync(join(tmpdir(), 'keepalive-checkout-'));
	const at = join(the_root, 'the-checkout');
	const where_it_goes = join(the_root, 'the-remote.git');
	mkdirSync(at);
	const git = (...words) => execFileSync('git', words, { cwd: at, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	git('init', '--quiet', '--initial-branch=main');
	git('config', 'user.name', 'ktoś testujący');
	git('config', 'user.email', 'a-test@example.invalid');
	if (with_a_remote) {
		execFileSync('git', ['init', '--quiet', '--bare', where_it_goes], { encoding: 'utf8', stdio: 'ignore' });
		git('remote', 'add', 'origin', where_it_goes);
	}
	execFileSync('git', ['commit', '--quiet', '--allow-empty', '-m', 'the last real commit'], {
		cwd: at,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		env: {
			...process.env,
			// **An epoch, and not "46 days ago".** Git accepts `@<seconds since the epoch>` and
			// refuses a phrase; a date it cannot read makes every commit fail, and a fixture
			// that fails to build looks like a script under test that refuses.
			GIT_AUTHOR_DATE: `@${Math.floor(Date.now() / 1000) - days_ago * A_DAY_IN_SECONDS}`,
			GIT_COMMITTER_DATE: `@${Math.floor(Date.now() / 1000) - days_ago * A_DAY_IN_SECONDS}`,
		},
	});
	return { at, where_it_goes };
};

/** How many commits a repository has, read the way GitHub reads one. */
const how_many_commits_are_in = (where) =>
	Number(
		execFileSync('git', ['rev-list', '--count', 'HEAD'], {
			cwd: where,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		}).trim(),
	);

describe('the silence is counted, and a silence that cannot be counted is refused', () => {
	it('counts the days since a date that is a date', () => {
		const a_week_ago = new Date(Date.now() - 7 * A_DAY_IN_SECONDS * 1000).toISOString();
		const counted = the_days_since(a_week_ago);
		ok(counted.was_counted);
		strictEqual(counted.how_many, 7);
		strictEqual(counted.why_not, null);
	});

	it('refuses a repository with no commits rather than answering zero days', () => {
		const counted = the_days_since(null);
		ok(!counted.was_counted);
		strictEqual(counted.how_many, null);
		match(counted.why_not, /no last commit/i);
	});

	it('refuses a string that is not a date rather than answering NaN days', () => {
		const counted = the_days_since('wczoraj');
		ok(!counted.was_counted);
		strictEqual(counted.how_many, null);
		match(counted.why_not, /not a date/i);
	});
});

describe('the limit is a number, and a limit that is not one is refused', () => {
	it('is long enough on the day it reaches the limit', () => {
		ok(the_silence_is_long_enough(THE_LIMIT, THE_LIMIT));
	});

	it('is not long enough the day before it reaches the limit', () => {
		ok(!the_silence_is_long_enough(THE_LIMIT - 1, THE_LIMIT));
	});

	it('refuses a limit that is not a number, by name', () => {
		for (const not_a_number of ['45', null, Number.NaN, true]) {
			let the_refusal = null;
			try {
				the_silence_is_long_enough(46, not_a_number);
			} catch (the_failure) {
				the_refusal = the_failure;
			}
			ok(the_refusal !== null, `a limit of ${JSON.stringify(not_a_number)} was accepted`);
			match(the_refusal.message, /limit/i);
			match(the_refusal.message, /not a number/i);
		}
	});
});

describe('the last commit is read from the checkout, and there is nothing to read in a plain directory', () => {
	it('reads the date of the last commit', () => {
		const { at } = a_checkout_silent_for(2);
		const the_date = the_date_of_the_last_commit(at);
		ok(the_date !== null);
		ok(!Number.isNaN(Date.parse(the_date)), `"${the_date}" is not a date git can have written`);
	});

	it('answers null in a directory that is not a checkout, rather than raising', () => {
		strictEqual(the_date_of_the_last_commit(a_directory_where_no_repository_is()), null);
	});
});

describe('a silence shorter than the limit pushes nothing, and the run is green', () => {
	it('pushes nothing and says how long the silence is', () => {
		const { at, where_it_goes } = a_checkout_silent_for(3);
		const the_answer = keep_the_schedule_alive({ at, the_limit: THE_LIMIT });
		ok(!the_answer.a_commit_was_pushed);
		strictEqual(the_answer.what_it_said, null);
		match(the_answer.why_not, /3 days is not 45/);
		strictEqual(how_many_commits_are_in(at), 1, 'the checkout gained a commit');
		// **The remote exists and is empty, and that is not the same as a remote that was
		// never created.** The fixture builds one so the push has somewhere real to land, so
		// what has to be checked is that nothing arrived. `for-each-ref` prints nothing and
		// exits 0 when there are no refs, where `git log main` **raises** exit 128 on a
		// revision that is not there — so the question has to be asked in the form that
		// answers "there is nothing" rather than crashing on it.
		strictEqual(
			execFileSync('git', ['for-each-ref', '--format=%(refname)'], { cwd: where_it_goes, encoding: 'utf8' }).trim(),
			'',
			'the remote gained a reference',
		);
	});

	it('refuses a directory with no commits, and pushes nothing anywhere', () => {
		const the_answer = keep_the_schedule_alive({ at: a_directory_where_no_repository_is() });
		ok(!the_answer.a_commit_was_pushed);
		match(the_answer.why_not, /no last commit/i);
	});
});

describe('a silence past the limit pushes one empty commit, and it reaches the remote', () => {
	it('puts the commit on the remote, because GitHub watches the repository and not the runner', () => {
		const { at, where_it_goes } = a_checkout_silent_for(46);
		const the_answer = keep_the_schedule_alive({ at, the_limit: THE_LIMIT });
		ok(the_answer.a_commit_was_pushed, `nothing was pushed: ${the_answer.why_not}`);
		strictEqual(how_many_commits_are_in(where_it_goes), 2, 'the remote did not gain the commit');
		match(
			execFileSync('git', ['log', '-1', '--format=%s'], { cwd: where_it_goes, encoding: 'utf8' }).trim(),
			new RegExp(THE_REASON),
		);
	});

	it('makes a commit that changes nothing, because a commit with content is a change', () => {
		const { at, where_it_goes } = a_checkout_silent_for(46);
		keep_the_schedule_alive({ at, the_limit: THE_LIMIT });
		const what_the_commit_changed = execFileSync('git', ['show', '--stat', '--format=', 'HEAD'], {
			cwd: where_it_goes,
			encoding: 'utf8',
		}).trim();
		strictEqual(what_the_commit_changed, '', 'the keepalive commit changed a file');
	});

	it('names the silence in the message, because the message is the only thing anybody reads', () => {
		const { at, where_it_goes } = a_checkout_silent_for(46);
		keep_the_schedule_alive({ at, the_limit: THE_LIMIT });
		const the_message = execFileSync('git', ['log', '-1', '--format=%s'], { cwd: where_it_goes, encoding: 'utf8' });
		match(the_message, /46 days of silence/);
	});

	it('pushes once and not on every run, because two hundred empty commits a year is noise', () => {
		const { at, where_it_goes } = a_checkout_silent_for(46);
		keep_the_schedule_alive({ at, the_limit: THE_LIMIT });
		const the_second_run = keep_the_schedule_alive({ at, the_limit: THE_LIMIT });
		ok(!the_second_run.a_commit_was_pushed, 'a second run on the same day pushed again');
		strictEqual(how_many_commits_are_in(where_it_goes), 2);
	});
});

describe('a checkout with no remote cannot keep anything alive, and says so', () => {
	it('reports the push that could not happen rather than claiming a commit went out', () => {
		const { at } = a_checkout_silent_for(46, { with_a_remote: false });
		const the_answer = keep_the_schedule_alive({ at, the_limit: THE_LIMIT });
		ok(!the_answer.a_commit_was_pushed);
		strictEqual(the_answer.what_it_said, null);
		match(the_answer.why_not, /could not be pushed/i);
	});
});
