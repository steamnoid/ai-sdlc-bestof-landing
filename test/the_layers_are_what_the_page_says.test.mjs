/**
 * A layer is what a package declares, and what is on disk is a different question.
 *
 * The project this page is about declares ten layers in one docstring and holds seven
 * directories, and the difference is the page: a project whose central recorded failure is
 * code that was built and never wired publishes the same gap about itself, as a table with
 * two columns rather than one sentence.
 *
 * So this file reads one side and counts the other, and never merges them. A reader that
 * reports a layer exists because the docstring named it has deleted the argument.
 *
 * | the reader is asked | it must answer |
 * |---|---|
 * | what does the package declare | the layers, in the order the docstring names them, and nothing else |
 * | which file answered | the file, so a stale editable install cannot pass for a checkout |
 * | what is on disk in a declared layer | the directory's absence, or its files and its modules, counted |
 * | a package that is not on disk | a refusal by name, never a count of zero |
 * | a layer declared and absent | an absent layer, which is a fact and not a zero |
 *
 * The one shape a fixture has to contain: a layer the docstring names and the tree does not
 * hold. `a_project_that_declares_its_layers` has one, and without it this file could not
 * tell a declaration from a directory.
 *
 * Nothing here reads the project the page is about. A test that needs a checkout beside this
 * one is red on every fresh clone, and a test that is red because of where it was run is a
 * test whose failure means nothing.
 */

import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { what_is_on_disk } from '../scripts/read_the_layers_on_disk.mjs';

const the_reader = resolve('scripts/ask_the_layers.py');

const the_project = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'fixtures',
	'a_project_that_declares_its_layers',
);

/** Ask the Python reader for a tree, and hand back what it printed. */
const ask_about = (at) => JSON.parse(execFileSync('python3', [the_reader, '--repository', at], { encoding: 'utf8' }));

/** Ask for a tree and hand back the refusal, or `null` when it answered. */
const ask_and_take_the_refusal = (at) => {
	try {
		execFileSync('python3', [the_reader, '--repository', at], { encoding: 'utf8', stdio: 'pipe' });
		return null;
	} catch (the_failure) {
		return the_failure;
	}
};

/** A package whose docstring says nothing about layers, which is the case that must be refused. */
const a_project_that_declares_nothing = () => {
	const the_root = mkdtempSync(join(tmpdir(), 'a-project-without-layers-'));
	mkdirSync(join(the_root, 'src', 'aisdlc'), { recursive: true });
	writeFileSync(
		join(the_root, 'src', 'aisdlc', '__init__.py'),
		'"""A package with a docstring and no list in it."""\n\nfrom __future__ import annotations\n',
	);
	return the_root;
};

describe('the layers a package declares, read out of its own docstring', () => {
	it('names all five, in the order the docstring names them', () => {
		const the_answer = ask_about(the_project);
		deepStrictEqual(
			the_answer.the_layers.map((a_layer) => a_layer.name),
			['domain', 'store', 'llm', 'web', 'repair'],
			'the reader read the docstring in its own order, or answered from a different tree',
		);
	});

	it('says which file answered, so a stale editable install cannot pass for a checkout', () => {
		const the_answer = ask_about(the_project);
		ok(
			the_answer.which_code_answered.endsWith('src/aisdlc/__init__.py'),
			`which_code_answered is ${the_answer.which_code_answered} and is not a file in this tree`,
		);
		ok(
			the_answer.which_code_answered.startsWith(the_project),
			`the code that answered is at ${the_answer.which_code_answered}, which is not inside ${the_project}`,
		);
	});

	it('carries what each layer says it holds, because a name alone is a label', () => {
		const the_domain = ask_about(the_project).the_layers.find((a_layer) => a_layer.name === 'domain');
		ok(
			the_domain.what_it_holds.startsWith('the rules'),
			`the domain layer says it holds "${the_domain.what_it_holds}" and the docstring says the rules`,
		);
	});

	it('reads the names in the tree and not the names the reader remembers', () => {
		for (const a_layer of ask_about(the_project).the_layers) {
			ok(
				!['IDLE', 'READY', 'AWAITING_HUMAN_APPROVAL', 'DONE'].includes(a_layer.name),
				`the layer ${a_layer.name} is a stage of the project this page is about, so the reader is not reading the tree it was given`,
			);
		}
	});
});

describe('a package that does not declare its layers is refused, not counted', () => {
	it('refuses by name, prints nothing on stdout, and says which file it was reading', () => {
		const the_failure = ask_and_take_the_refusal(a_project_that_declares_nothing());
		ok(the_failure, 'a package whose docstring lists no layers was answered about rather than refused');
		strictEqual(the_failure.status, 1, 'the refusal exited zero, so a collector would read it as an answer');
		strictEqual(
			the_failure.stdout,
			'',
			'stdout carried something, so a caller reading stdout gets a page state with no refusal in it',
		);
		match(
			String(the_failure.stderr),
			/TheLayersAreNotDeclaredError/,
			'the refusal is not named after the rule it protects',
		);
	});

	it('is a different refusal from a tree that is not a package at all', () => {
		const the_failure = ask_and_take_the_refusal(a_project_that_declares_nothing());
		match(
			String(the_failure.stderr),
			/__init__\.py/,
			'the refusal does not name the file it was reading, so a reader cannot go and look at it',
		);
	});
});

describe('what is on disk in each declared layer', () => {
	/**
	 * The tree reader answers about the layers the docstring declared, so it is handed them.
	 *
	 * **It is not handed a tree to go and find them itself.** That would be the two
	 * questions answering each other: a reader that read the docstring to decide what to
	 * count cannot report a disagreement between the two, because it already merged them.
	 */
	const the_tree = () => what_is_on_disk(the_project, ask_about(the_project).the_layers);

	it('says a declared layer that is not there is absent, and not a layer holding nothing', () => {
		const the_repair = the_tree().find((a_layer) => a_layer.name === 'repair');
		ok(the_repair, 'a layer the docstring declares is missing from the answer, so the reader dropped it');
		strictEqual(
			the_repair.is_a_directory,
			false,
			'repair/ is declared and absent, and an absent directory is not a directory holding no files',
		);
		strictEqual(
			the_repair.how_many_files,
			null,
			'an absent directory has no file count, and a count of zero would read as a layer that was emptied',
		);
	});

	it('counts a subdirectory as no files at all, because the project has one', () => {
		// **The fixture's `web/` holds a `ui/` and no code, and the project this page is
		// about is in exactly that state.** A reader that counted directory entries rather
		// than files reported a layer with a module in it, in the one column on the page that
		// exists to keep a promise out of a code count.
		const the_web = the_tree().find((a_layer) => a_layer.name === 'web');
		strictEqual(the_web.is_a_directory, true, 'web/ is a directory here, unlike the fixture it replaced');
		strictEqual(the_web.how_many_files, 0, 'web/ holds a subdirectory and no files');
		strictEqual(the_web.how_many_modules, 0, 'web/ holds no code, and a subdirectory is not code');
	});

	it('tells a directory holding nothing from a directory that is not there', () => {
		// **Both are "no code", and they are not the same fact.** `web/` is a directory
		// somebody made and has not filled; `repair/` is a promise in a docstring. A page
		// that rendered both as a zero would be reporting one absence twice and calling it a
		// count, which is the shape every wrong number on a page has.
		const the_layers = the_tree();
		const the_web = the_layers.find((a_layer) => a_layer.name === 'web');
		const the_repair = the_layers.find((a_layer) => a_layer.name === 'repair');
		ok(
			the_web.is_a_directory !== the_repair.is_a_directory,
			'two ways of holding nothing are reported as the same thing, so the page cannot tell them apart',
		);
	});

	it('counts files and modules apart, because a package directory holding only its own init is not a layer with code in it', () => {
		const the_layers = the_tree();
		const the_store = the_layers.find((a_layer) => a_layer.name === 'store');
		strictEqual(the_store.how_many_files, 2, 'the store layer holds an init and one module');
		strictEqual(
			the_store.how_many_modules,
			1,
			'the store layer holds one module, and a reader counting the init as one reports a layer with two modules in it',
		);
		strictEqual(
			the_layers.find((a_layer) => a_layer.name === 'llm').how_many_modules,
			0,
			'the llm layer holds only its init, and that is a directory and nothing else',
		);
	});

	it('answers every layer the docstring declared, including the one with no directory', () => {
		deepStrictEqual(
			the_tree().map((a_layer) => a_layer.name),
			['domain', 'store', 'llm', 'web', 'repair'],
			'the tree answer is not the declared list, so the two columns of the page cannot be lined up',
		);
	});

	it('refuses a package that is not on disk, by name', () => {
		let the_refusal = null;
		try {
			what_is_on_disk(resolve('test', 'fixtures', 'a_project_that_is_not_here'), []);
		} catch (the_error) {
			the_refusal = the_error;
		}
		ok(the_refusal, 'a package that is not on disk was counted rather than refused');
		strictEqual(
			the_refusal.name,
			'ThePackageIsNotOnDiskError',
			'the refusal is not named after the rule it protects',
		);
	});
});
