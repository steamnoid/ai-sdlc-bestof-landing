/**
 * A directory inside a checkout is not a checkout, and that is the whole subject.
 *
 * This repository holds a fixture under `test/fixtures/`, and `git rev-parse` run inside a
 * subdirectory answers with the repository **enclosing** it. A reader that trusted the
 * answer would report this landing page's history as the fixture's — a page describing a
 * working tree it is standing in, which is the mistake every other reader in this repository
 * exists to prevent, arrived at through a different door.
 *
 * The pairing is the second subject, because the project states its own rule in its own
 * `AGENTS.md`: a behaviour change is a failing test first, two commits, and a GREEN with no
 * RED beside it is a violation anybody can see. So the page reports **three numbers and no
 * verdict** — whether a squash merge satisfies the rule is a judgement about a project, and
 * a page that decides it is deciding something it was not asked to.
 *
 * | what must hold | what the reader answers |
 * |---|---|
 * | a directory inside a checkout | `is_a_git_repository: false`, naming the checkout that answered |
 * | a directory that is no checkout at all | the same, and `commits: []` rather than a count of zero |
 * | a real checkout | the branch, the tip, and its commits oldest first |
 * | the recent commits | newest first, and a page's worth rather than the whole history |
 * | a RED followed by a GREEN | answered |
 * | a RED followed by anything else | **not answered**, and a reader that counted "somewhere later" would hide it |
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { match, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	HOW_MANY_COMMITS_THE_PAGE_SHOWS,
	how_the_history_holds_up,
	is_a_git_repository,
	read_the_history,
} from '../scripts/read_the_git_history.mjs';

/** A checkout with the given commit subjects, built for real because a mock proves nothing. */
const a_checkout_with = (the_subjects) => {
	const the_root = mkdtempSync(join(tmpdir(), 'a-checkout-'));
	const git = (...the_question) =>
		execFileSync('git', the_question, { cwd: the_root, encoding: 'utf8' });
	git('init', '--quiet', '--initial-branch=main');
	git('config', 'user.name', 'a test');
	git('config', 'user.email', 'test@localhost');
	for (const a_subject of the_subjects) {
		writeFileSync(join(the_root, 'a-file.txt'), `${a_subject}\n`);
		git('add', '.');
		git('commit', '--quiet', '-m', a_subject);
	}
	return the_root;
};

describe('a directory inside a checkout, and one that is not a checkout at all', () => {
	it('refuses a fixture that sits inside one, and names the checkout that answered', () => {
		// **The trap this repository walks into daily.** Its own fixture has no history of
		// its own, and every reader that asks git from inside it gets *this page's* history
		// back. A page that printed that would be describing itself while claiming to
		// describe the project.
		const the_answer = read_the_history('test/fixtures/a_small_project');
		strictEqual(
			the_answer.is_a_git_repository,
			false,
			'a fixture inside a checkout was counted as a checkout, and answered with the enclosing repository\'s history',
		);
		ok(the_answer.why_not.length > 0, 'the refusal is a flag and no sentence, so a reader cannot tell what went wrong');
		match(the_answer.why_not, /inside a checkout/, 'the reason does not say that it is inside one');
		ok(
			the_answer.branch === null && the_answer.tip_commit === null,
			'a directory that is not a checkout reported a branch and a tip, and a page would print them',
		);
	});

	it('refuses a directory that is no checkout, and counts no commits as zero', () => {
		const the_answer = read_the_history(mkdtempSync(join(tmpdir(), 'no-git-here-')));
		strictEqual(the_answer.is_a_git_repository, false, 'a directory with no checkout in it was counted as one');
		ok(
			Array.isArray(the_answer.commits) && the_answer.commits.length === 0,
			'a project with no history reported commits, and a count of zero is a different fact from an unread one',
		);
	});

	it('reports a real checkout by its branch and its tip', () => {
		const the_root = a_checkout_with(['docs: the first thing', 'feat(x): the second']);
		const the_answer = read_the_history(the_root);
		strictEqual(the_answer.is_a_git_repository, true, 'a real checkout was refused');
		strictEqual(the_answer.branch, 'main', 'the branch was not read');
		ok(the_answer.tip_commit.length > 0, 'the tip commit was not read');
		strictEqual(the_answer.commits.length, 2, 'the number of commits is wrong');
	});
});

describe('a RED is answered by the commit immediately after it, and by nothing further', () => {
	it('counts a RED followed by a GREEN', () => {
		strictEqual(
			how_the_history_holds_up([{ subject: 'test(x): RED — a thing' }, { subject: 'feat(x): the thing' }]).answered,
			1,
			'a RED followed by a GREEN is not an answered RED',
		);
	});

	it('does not count a RED answered two commits later', () => {
		// **A branch where a RED is followed by a REFACTOR and then a GREEN has an unheld
		// RED**, and a reader that counted "somewhere later" would hide exactly the case the
		// project's own rule exists for.
		const the_answer = how_the_history_holds_up([
			{ subject: 'test(x): RED — a thing' },
			{ subject: 'refactor(x): a tidy' },
			{ subject: 'feat(x): the thing' },
		]);
		strictEqual(the_answer.red, 1, 'the RED was not counted');
		strictEqual(the_answer.answered, 0, 'a RED two commits before its GREEN was counted as answered');
	});

	it('does not count a GREEN with no RED beside it, and reports all three numbers together', () => {
		// **Three numbers and no verdict.** The project squash-merges whole cycles, so whether
		// a squash satisfies the rule is a judgement about a project — and a page that decides
		// it is deciding something nobody asked it to decide.
		const the_answer = how_the_history_holds_up([
			{ subject: 'test(x): RED — a' },
			{ subject: 'feat(x): b' },
			{ subject: 'docs: c' },
			{ subject: 'The domain, six stages (#1)' },
		]);
		strictEqual(the_answer.red, 1, 'the RED count is wrong');
		strictEqual(the_answer.green, 1, 'the GREEN count is wrong');
		strictEqual(the_answer.answered, 1, 'the answered count is wrong');
		ok(!('verdict' in the_answer), 'the pairing produced a verdict, and a verdict is a judgement about a project');
	});
});

describe('the recent commits, and no more than a page shows', () => {
	it('gives them newest first, and a page\'s worth rather than the whole history', () => {
		const the_subjects = Array.from({ length: 14 }, (_, an_index) => `docs: commit ${an_index}`);
		const the_answer = read_the_history(a_checkout_with(the_subjects));
		strictEqual(the_answer.commits.length, 14, 'the whole history was not read, and the page links to it');
		strictEqual(
			the_answer.recent.length,
			HOW_MANY_COMMITS_THE_PAGE_SHOWS,
			'the recent list is not the length the page shows',
		);
		strictEqual(
			the_answer.recent[0].subject,
			'docs: commit 13',
			'the most recent commit is not first, and a reader arriving at a page wants the recent ones',
		);
	});
});
