/**
 * A file on disk is a file somebody wrote, and a file the project holds is a file everybody
 * who clones it gets.
 *
 * **The project this page is about has three layers that are directories and not layers.**
 * `creative/` and `repair/` are empty, and `web/` holds a `ui/` and no code — and none of
 * the three is in git, so a clone does not have them. A page about a repository that
 * reported them would be describing somebody's working tree, which is the one thing a
 * sibling page's README names as the failure this whole architecture exists to prevent.
 *
 * So the tree reader answers about a disk and this one answers about a project, and the
 * page prints the difference rather than choosing between them. The two agree on a clean
 * checkout and disagree on exactly the files a developer has not committed, which is the
 * interesting set.
 *
 * | the reader is asked | it must answer |
 * |---|---|
 * | which files does the project hold, per layer | the counts, taken from `git ls-files` and not from a walk |
 * | a layer the project holds nothing in | a count of zero, which is different from an absent directory |
 * | a directory that is not in a checkout at all | `TheProjectIsNotACheckoutError` |
 * | a file on disk that git does not hold | a difference, and never a merged count |
 *
 * The fixture's `creative/` carries a module and a `.gitignore` that ignores it, so both
 * halves of the disagreement are on disk in one place: the file exists and the project
 * does not have it.
 */

import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { statSync } from 'node:fs';

import { where_the_package_lives } from './read_the_layers_on_disk.mjs';

export class TheProjectIsNotACheckoutError extends Error {
	constructor(inside) {
		super(
			`${inside} is not a git checkout, so it holds nothing to report. A directory that is ` +
				`not a checkout is not a project holding no files, and a page that printed a count of ` +
				`zero for it would be reporting a fact nobody looked for.`,
		);
		this.name = 'TheProjectIsNotACheckoutError';
	}
}

/** Ask git a question in a checkout, and hand back what it said. */
const ask_git = (inside, ...the_question) => {
	try {
		return execFileSync('git', the_question, { cwd: resolve(inside), encoding: 'utf8' });
	} catch {
		throw new TheProjectIsNotACheckoutError(inside);
	}
};

/**
 * Which files the project holds under a path, named the way git names them.
 *
 * **`git ls-files` writes paths from the repository's root, not from the directory it was
 * run in.** Asked from a package's own directory it answers with paths that all begin
 * `test/fixtures/…/src/aisdlc/`, and a reader filtering for `src/aisdlc/` matches nothing
 * and reports every layer as holding zero files — which looks exactly like a project that
 * is empty, and is the one answer a page about a repository may never give about a
 * repository that is not empty. So the root is asked for and the prefix is built from it.
 */
const the_files_git_holds = (inside) => {
	const the_root = ask_git(inside, 'rev-parse', '--show-toplevel').trim();
	const the_package = relative(the_root, where_the_package_lives(inside)).split('\\').join('/');
	// **Git is run from the root and given a root-relative path, because the two disagree
	// about what a path means.** A pathspec is read from the directory git runs in and the
	// answer is written from the root, so asked from a package's own directory this reader
	// named a path that does not exist there, was given nothing, and reported every layer
	// as holding zero files — which reads exactly like a project that is empty.
	return ask_git(the_root, 'ls-files', '--', the_package)
		.split('\n')
		.filter((a_path) => a_path !== '')
		.map((a_path) => a_path.slice(the_package.length + 1));
};

/**
 * What the project itself holds in each of the layers a package declared.
 *
 * @param {string} inside - a checkout of the project being read
 * @param {Array<{name: string}>} the_layers - what `ask_the_layers.py` declared, in its order
 * @returns {Array<{name: string, how_many_files: number, how_many_modules: number}>}
 *   one entry per declared layer, in the order declared
 */
export function what_the_project_holds(inside, the_layers) {
	const the_paths = the_files_git_holds(inside);

	return the_layers.map((a_layer) => {
		const the_prefix = `${a_layer.name}/`;
		// **Only Python, and only in the layer's own directory.** A file in a subdirectory is
		// a thing somebody was about to write, and a file beside a layer is not in it — the
		// two readers count the same set for the same reason or they are not comparable.
		const the_own = the_paths.filter(
			(a_path) => a_path.startsWith(the_prefix) && a_path.endsWith('.py') && !a_path.slice(the_prefix.length).includes('/'),
		);
		return {
			name: a_layer.name,
			how_many_files: the_own.length,
			// **The check is on the file's own name and not on the whole path.** A layer's
			// init sits at `store/__init__.py`, and a reader that compared the path to
			// `__init__.py` counted it as a module — so the two readers disagreed about a
			// committed layer, which is the one disagreement that makes the other one
			// unbelievable.
			how_many_modules: the_own.filter((a_path) => a_path.split('/').pop() !== '__init__.py').length,
		};
	});
}
