/**
 * Count what is on disk in each layer a package declared.
 *
 * **The other half of the page's first table, and it asks a different question from
 * `ask_the_layers.py`.** That one imports the package and reports what it *declares*; this
 * one walks the tree and reports what is *there*. The project this page is about declares
 * ten layers and holds seven of them, and the gap is the page — a project whose central
 * recorded failure is code that was built and never wired publishes that same gap about
 * itself, in two columns, rather than in one sentence that could have gone either way.
 *
 * So the two are never merged here, and the caller never merges them either. A reader that
 * reported a layer as present because the docstring named it would have deleted the only
 * thing this page is for.
 *
 * | what is on disk | what this answers |
 * |---|---|
 * | a directory the docstring named | its files, and its modules counted apart from its init |
 * | a directory the docstring named and the tree does not hold | `is_a_directory: false` — an absence, never a count of zero |
 * | a directory holding only `__init__.py` | a directory and nothing else, which the page says in words |
 * | a package that is not on disk at all | `ThePackageIsNotOnDiskError` |
 *
 * A package directory with no `__init__.py` is still counted, and the file count says so —
 * a namespace package is a real tree, and a reader that refused it would report a project
 * that has declared nothing as a project it could not read.
 */

import { readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

export class ThePackageIsNotOnDiskError extends Error {
	constructor(where_it_was_looked_for) {
		super(
			`there is no package at ${where_it_was_looked_for}, so there is nothing to count. ` +
				`A package that is not on disk is not a package holding no layers, and a page that ` +
				`printed a count of zero for it would be reporting a fact nobody looked for.`,
		);
		this.name = 'ThePackageIsNotOnDiskError';
	}
}

/** Where a checkout keeps the package whose layers are being counted. */
export function where_the_package_lives(inside) {
	return isAbsolute(inside) ? join(inside, 'src', 'aisdlc') : resolve(inside, 'src', 'aisdlc');
}

/** Whether a path is a directory, answering `false` rather than throwing for an absent one. */
const is_a_directory = (at) => {
	try {
		return statSync(at).isDirectory();
	} catch {
		return false;
	}
};

/**
 * What is on disk in each of the layers a package declared.
 *
 * @param {string} inside - a checkout of the project being read
 * @param {Array<{name: string}>} the_layers - what `ask_the_layers.py` declared, in its order
 * @returns {Array<{name: string, is_a_directory: boolean, how_many_files: number|null,
 *   how_many_modules: number|null}>} one entry per declared layer, in the order declared
 */
export function what_is_on_disk(inside, the_layers) {
	const the_package = where_the_package_lives(inside);
	if (!is_a_directory(the_package)) {
		throw new ThePackageIsNotOnDiskError(the_package);
	}

	return the_layers.map((a_layer) => {
		const the_directory = join(the_package, a_layer.name);
		if (!is_a_directory(the_directory)) {
			return { name: a_layer.name, is_a_directory: false, how_many_files: null, how_many_modules: null };
		}
		const the_files = readdirSync(the_directory).filter((a_name) => a_name !== '__pycache__');
		return {
			name: a_layer.name,
			is_a_directory: true,
			how_many_files: the_files.length,
			// **`__init__.py` is counted as a file and not as a module**, because a layer whose
			// only file is its own init is a directory and nothing else. Counting it as a module
			// reports a layer with code in it where there is no code.
			how_many_modules: the_files.filter((a_name) => a_name !== '__init__.py').length,
		};
	});
}
