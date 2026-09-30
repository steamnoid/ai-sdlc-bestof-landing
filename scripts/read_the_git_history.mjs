/**
 * The project's own history, and how its commits hold up against its own rule.
 *
 * **A directory that is not a checkout is not a project with no commits**, and the
 * difference is not academic here: this repository holds a fixture under `test/fixtures/`,
 * and `git rev-parse` run inside a subdirectory answers with the repository *enclosing* it.
 * A reader that trusted the answer would report this landing page's history as the
 * fixture's — which is the same shape of mistake as a page describing a working tree
 * somebody is halfway through changing. So the top level git names is compared against the
 * real path of the directory, and a subdirectory answers "not a checkout" rather than
 * somebody else's history.
 *
 * The pairing is the interesting part, because the project states its own rule: a behaviour
 * change is a failing test first, two commits, and a GREEN with no RED on the branch is a
 * violation anybody can see. So the page can report how well the history holds up — and it
 * reports **three numbers and no verdict**, because whether a squash merge satisfies the
 * rule is a judgement about a project and not a fact about a file.
 *
 * | what is asked | what it answers |
 * |---|---|
 * | is this a checkout | yes or no, and the path git named, so a reader can see which |
 * | which branch, which tip | both, and a directory that is not a checkout carries neither |
 * | how many commits say they are RED | a number, and `0` means none — not "unread" |
 * | how many make something pass | a number |
 * | how many RED commits the next commit answers | a number, and the three are reported together |
 * | the last few commits, newest first | for a reader, and never more than the page shows |
 */

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

/** How many commits the page shows, and why not more. */
export const HOW_MANY_COMMITS_THE_PAGE_SHOWS = 8;

/** What a commit subject has to say for this reader to call it a RED or a GREEN. */
const is_saying_it_is_red = (a_subject) => a_subject.startsWith('test(') && a_subject.includes('RED');
const is_making_something_pass = (a_subject) =>
	a_subject.startsWith('feat(') || a_subject.startsWith('fix(');

/** Ask git a question in a directory, and hand back what it said. */
const asking_git = (inside, ...the_question) => {
	try {
		return execFileSync('git', the_question, { cwd: resolve(inside), encoding: 'utf8' }).trim();
	} catch {
		return null;
	}
};

/** Whether a directory is a checkout in its own right and not inside somebody else's. */
export function is_a_git_repository(inside) {
	const the_top_level = asking_git(inside, 'rev-parse', '--show-toplevel');
	if (the_top_level === null) return { is_one: false, why_not: 'the directory read is not a git checkout, so there is no history to count' };
	// **The real path on both sides.** macOS puts `/tmp` behind a symlink, and a checkout
	// reached through one resolves to a path that looks like a different directory and is
	// this one — so a strict comparison refuses a directory that *is* a checkout.
	const the_directory = realpathSync(resolve(inside));
	const the_root = realpathSync(the_top_level);
	if (the_directory !== the_root) {
		return {
			is_one: false,
			why_not: `${inside} is inside a checkout rather than being one, and ${the_root} answered with its own history`,
		};
	}
	return { is_one: true, why_not: null };
}

/** Every commit, oldest first, because a pairing is a question about what came next. */
const every_commit_in = (inside) =>
	(asking_git(inside, 'log', '--reverse', '--format=%h%x1f%s%x1f%aI') ?? '')
		.split('\n')
		.filter((a_line) => a_line !== '')
		.map((a_line) => {
			const [the_commit, the_subject, the_moment] = a_line.split(String.fromCharCode(31));
			return { commit: the_commit, subject: the_subject, authored_at: the_moment };
		});

/**
 * How the history holds up against the project's own rule.
 *
 * @param {Array<{subject: string}>} the_commits - oldest first
 * @returns {{red: number, green: number, answered: number}}
 */
export function how_the_history_holds_up(the_commits) {
	const red = the_commits.filter((a_commit) => is_saying_it_is_red(a_commit.subject));
	const green = the_commits.filter((a_commit) => is_making_something_pass(a_commit.subject));
	// **A RED is answered by the commit immediately after it**, and by nothing further: a
	// branch where three REDs are followed by one GREEN has two of them unheld, and counting
	// "somewhere later" would hide exactly the case the rule exists for.
	const answered = the_commits.filter(
		(a_commit, at) =>
			is_saying_it_is_red(a_commit.subject) &&
			at + 1 < the_commits.length &&
			is_making_something_pass(the_commits[at + 1].subject),
	).length;
	return { red: red.length, green: green.length, answered };
}

/**
 * The history of a checkout.
 *
 * @param {string} inside - a checkout of the project
 * @returns {object} the three shapes: counted, or not a checkout at all
 */
export function read_the_history(inside) {
	const whether = is_a_git_repository(inside);
	if (!whether.is_one) {
		return {
			is_a_git_repository: false,
			why_not: whether.why_not,
			branch: null,
			tip_commit: null,
			commits: [],
			recent: [],
			...how_the_history_holds_up([]),
		};
	}
	const the_commits = every_commit_in(inside);
	return {
		is_a_git_repository: true,
		why_not: null,
		branch: asking_git(inside, 'rev-parse', '--abbrev-ref', 'HEAD'),
		tip_commit: asking_git(inside, 'rev-parse', '--short', 'HEAD'),
		commits: the_commits,
		// **Newest first, and a page's worth.** A reader arriving at a page wants the recent
		// ones, and the whole history is in the repository the page links to.
		recent: the_commits.slice(-HOW_MANY_COMMITS_THE_PAGE_SHOWS).reverse(),
		...how_the_history_holds_up(the_commits),
	};
}
