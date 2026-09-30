/**
 * Where a name is declared in a project's own source, and how it was looked for.
 *
 * **The glossary's `Built` column is the project making a claim about itself, and a page is
 * the only reader of that claim that does not share the project's assumptions.** The project
 * holds itself to it with a test in a suite that has to be installed and run; this reader
 * looks at one thing and nothing else, so what it can say is narrower — and it says what that
 * thing is.
 *
 * | what is asked | what this answers |
 * |---|---|
 * | is this name declared anywhere in `src/` | the files that declare it, by path |
 * | a name declared in one file | that file, and no claim about how often it is raised |
 * | a name declared nowhere | an empty list, which is a fact and not a failure to look |
 * | no source tree at all | `TheSourceIsNotThereError` |
 *
 * **This is not the same check the project makes on itself, and the page has to say so.** The
 * project's own test asks whether anything *raises* a refusal. This reader asks whether a
 * class of that name is *declared* — which is a weaker claim, because a refusal can be
 * declared and never raised, and that is the defect this architecture was built after. A page
 * that reported the two as one check would overstate what it knows by exactly the amount the
 * project cares about.
 *
 * **A name is looked for as a declaration, and not as a word.** The whole family had this
 * defect once and this project's glossary says so in its own reading rules: a refused word
 * written in ordinary prose would be found by any search for text, so every name the project
 * refuses would appear to be declared. Only `class`, `def` and an assignment are declarations,
 * and a name inside a string or a comment is not one.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export class TheSourceIsNotThereError extends Error {
	constructor(where_it_was_looked_for) {
		super(
			`there is no source at ${where_it_was_looked_for}, so no name can be found in it. A ` +
				`project with no source is not a project that declares nothing.`,
		);
		this.name = 'TheSourceIsNotThereError';
	}
}

/** Every Python file under a directory, in a stable order and skipping what a build leaves. */
const every_python_file_in = (a_directory) => {
	const the_files = [];
	for (const an_entry of readdirSync(a_directory).sort()) {
		if (an_entry === '__pycache__' || an_entry === '.venv') continue;
		const the_path = join(a_directory, an_entry);
		if (statSync(the_path).isDirectory()) {
			the_files.push(...every_python_file_in(the_path));
		} else if (an_entry.endsWith('.py')) {
			the_files.push(the_path);
		}
	}
	return the_files;
};

/**
 * Which files under a checkout declare a name.
 *
 * @param {string} inside - a checkout of the project being read
 * @param {string} a_name - a name, as the glossary writes it
 * @returns {{name: string, the_files_that_declare_it: string[], how_it_was_looked_for: string}}
 */
export function where_a_name_is_declared(inside, a_name) {
	const the_source = join(inside, 'src');
	if (statSync(the_source, { throwIfNoEntry: false }) === undefined) {
		throw new TheSourceIsNotThereError(the_source);
	}

	// **A declaration and not a mention.** `class Name`, `def name` and `name =` are the
	// three ways a name enters a module; a name inside prose, a docstring or a string is a
	// mention, and this project writes the names it refuses in ordinary prose on purpose —
	// so a search for text finds every name in it.
	const the_declaration = new RegExp(
		`^[ \\t]*(?:class|def)[ \\t]+${a_name}\\b|^[ \\t]*${a_name}[ \\t]*(?::[^=]+)?=`,
		'gm',
	);

	return {
		name: a_name,
		the_files_that_declare_it: every_python_file_in(the_source).filter((a_file) =>
			the_declaration.test(readFileSync(a_file, 'utf8')),
		),
		how_it_was_looked_for:
			'a declaration — a class, a function, or an assignment — somewhere under `src/`, ' +
			'and not a mention of the name in prose, which is how a project writes the names it refuses',
	};
}
