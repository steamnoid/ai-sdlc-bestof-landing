/**
 * One file of facts, written once — or not at all.
 *
 * The policy this file holds is a single distinction, and the page's every section rests on
 * it: **a fact a project does not have is a fact, and a fact this page could not read is a
 * fault.** A collector that renders the second as the first reports a project as emptier
 * than it is, which is the one wrong sentence a page about unfinished work may never print.
 *
 * | a reader refuses | the collector must |
 * |---|---|
 * | the layers, the domain | **stop, name it, and leave nothing behind** |
 * | a document that is not published | carry the value and the reason, and carry on |
 * | a gate map that is not there | carry `null` and the reason, and carry on |
 *
 * The middle column is the whole test. A collector that refused on a missing document would
 * refuse on every project that has not written one, and this page is for a project that
 * documents things before it builds them.
 *
 * **Nothing is written until everything is collected.** A refusal halfway through leaves a
 * half-answer on disk, and a page built from a half-answer is a page that cannot say which
 * half it has — which is what happened to a sibling page, one project of four, three
 * quarters of a page published looking complete.
 */

import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { before, describe, it } from 'node:test';

import {
	collect_everything_about,
	TheProjectCouldNotBeReadError,
	write_the_state,
} from '../scripts/ask_the_repository.mjs';

const the_project = resolve('test', 'fixtures', 'a_small_project');

const collect_about = async (at, overrides = {}) =>
	collect_everything_about(at, {
		owner: 'fixture',
		name: 'a_small_project',
		this_page: 'a_small_project-landing',
		was_the_suite_asked_for: null,
		...overrides,
	});

describe('one state, holding everything the page may say', () => {
	let the_state;
	before(async () => {
		the_state = await collect_about(the_project);
	});

	it('names the page and the project separately, because a reader needs to know which is which', async () => {
		strictEqual(the_state.this_page.name, 'a_small_project-landing', 'the page is not named in the state');
		strictEqual(the_state.the_project.name, 'a_small_project', 'the project is not named in the state');
		ok(
			the_state.this_page.url !== the_state.the_project.address,
			'the page and the project share an address, so every link on the page is ambiguous',
		);
	});

	it('carries three columns for the layers, and a reader that merged them would lose the argument', async () => {
		deepStrictEqual(
			Object.keys(the_state.the_layers),
			['the_declared', 'on_disk', 'in_the_project'],
			'the three columns are not the three the page prints',
		);
		strictEqual(
			the_state.the_layers.the_declared.length,
			the_state.the_layers.on_disk.length,
			'the declared list and the on-disk list are different lengths, so the two columns cannot be lined up',
		);
	});

	it('carries a missing gate map as null with a sentence, and not as an absence', async () => {
		strictEqual(the_state.the_domain.gates, null, 'a gate map appeared for a project that has not written one');
		ok(
			the_state.the_domain.why_the_gates_could_not_be_read !== null,
			'there is no gate map and no reason, so the page would print an empty section',
		);
	});

	it('carries a suite nobody asked to run as the third thing', async () => {
		strictEqual(the_state.the_suite.was_run, false, 'a suite nobody asked to run says it was run');
		match(the_state.the_suite.why_not, /--run-the-suite/, 'the suite does not say what would run it');
	});

	it('says which interpreter read the code, because a page reporting a build must say on what', async () => {
		ok(
			the_state.the_project.read_with.endsWith('python') || the_state.the_project.read_with === 'python3',
			`the interpreter is "${the_state.the_project.read_with}" and is not a program`,
		);
	});

	it('names a rule the tree does not hold, and says which file it is looking for', async () => {
		strictEqual(
			the_state.the_built_column.how_many_are_refuted,
			1,
			'the fixture has exactly one claim the tree refutes, and a different number were found',
		);
		ok(
			the_state.the_built_column.how_it_was_checked !== null,
			'the check is not accounted for, so the page cannot print the weaker half of the claim',
		);
	});
});

describe('a project this page could not read', () => {
	it('refuses by name, and says which reader and which rule', async () => {
		let the_refusal = null;
		try {
			await collect_about(join(tmpdir(), 'a-project-that-is-not-here'));
		} catch (the_failure) {
			the_refusal = the_failure;
		}
		ok(the_refusal, 'a tree that is not a project was answered about rather than refused');
		strictEqual(the_refusal.name, 'TheProjectCouldNotBeReadError', 'the refusal is not named after the rule it protects');
		ok(the_refusal.which_reader.length > 0, 'the refusal does not say which reader gave up');
	});

	it('carries the reader\'s own words, and not a summary of them', async () => {
		// **The property, not the branch.** A tree that is not a project can fail in more
		// than one place — no package, an unimportable package, a package that declares no
		// layers — and the first version of this test listed two of those names by hand and
		// failed on the third, which was the *better* refusal: a package that will not import
		// is a checkout that is not installed, which is not the same fact as a package that
		// declares no architecture.
		let the_refusal = null;
		try {
			await collect_about(join(tmpdir(), 'a-project-that-is-not-here'));
		} catch (the_failure) {
			the_refusal = the_failure;
		}
		match(
			the_refusal.message,
			/\b[A-Z][A-Za-z]*Error\b/,
			'the message carries no refusal class name, so it is a summary and the rule behind it is lost',
		);
		match(
			the_refusal.message,
			/a-project-that-is-not-here/,
			'the message does not name what was read, so a reader cannot go and look at it',
		);
	});
});

describe('the state is written once, or not at all', () => {
	it('writes a file a person can read, tab-indented and newline-terminated', async () => {
		const the_directory = mkdtempSync(join(tmpdir(), 'the-state-'));
		const where = join(the_directory, 'nested', 'the_bestof.json');
		try {
			write_the_state({ a: 1, b: { c: [1, 2] } }, where);
			const the_text = readFileSync(where, 'utf8');
			strictEqual(the_text.endsWith('\n'), true, 'the file is not newline-terminated, so every diff of it shows a change');
			match(the_text, /\n\t"b"/, 'the file is not tab-indented, and a diff of it is something a person reads');
		} finally {
			rmSync(the_directory, { recursive: true, force: true });
		}
	});

	it('leaves no file behind when a reader refused, because a half-answer looks like an answer', async () => {
		const the_directory = mkdtempSync(join(tmpdir(), 'the-state-'));
		const where = join(the_directory, 'the_bestof.json');
		try {
			let it_refused = false;
			try {
				write_the_state(await collect_about(join(tmpdir(), 'a-project-that-is-not-here')), where);
			} catch {
				it_refused = true;
			}
			strictEqual(it_refused, true, 'a tree that is not a project was collected without refusing');
			strictEqual(existsSync(where), false, 'a refusal left a state file behind, and a page could be built from it');
		} finally {
			rmSync(the_directory, { recursive: true, force: true });
		}
	});
});
