/**
 * A document that makes a claim about a file is the third such table in this project, and
 * the reader is what makes it a check rather than a decoration.
 *
 * A project this page is about publishes a rules table naming, for each of its rules, the
 * test file that holds it — and one row in the fixture names a document that is not there.
 * That is the whole subject of this file: a rule pointing at a missing file is a rule
 * nobody is holding, and it is invisible to a reader that transcribes the table.
 *
 * | the document | what is read | the check this makes possible |
 * |---|---|---|
 * | `AGENTS.md` | the rules table | **does the file holding each rule exist** |
 * | `pyproject.toml` | dependencies, and the prose above them | the count against the prose |
 * | `.github/workflows/*.yml` | the workflow and its steps | the count of jobs |
 * | `README.md` | the shell blocks | what a visitor may run |
 * | `LICENSE` | its first line | nothing — but printed in the file's own words |
 *
 * Two rules that a reader of documents gets wrong the moment it is convenient:
 *
 * **A cell holding a bare word is a tool and not a file.** `ruff` `D` names a program;
 * `pyproject.toml` `addopts` names a setting. Asking whether `ruff` "exists" as a path
 * answers a question nobody asked, and a reader that answered it would report a rule held by
 * lint as a rule held by nothing. So the answer is three-valued: `true`, `false`, and `null`
 * for a rule no file holds.
 *
 * **A document that is absent is a value and a document that has moved is a refusal.** A
 * project publishing no rules table is a fact; a table that has been reorganised is a fault
 * in the reader's assumption, and rendering it as an empty section says "nothing to report"
 * by accident.
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
	read_the_licence,
	read_the_manifest,
	read_the_rules,
	read_what_a_visitor_may_run,
	read_the_workflows,
} from '../scripts/read_the_documentation.mjs';

const the_project = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'a_small_project');
const the_project_that_is_not_here = resolve('test', 'fixtures', 'a_project_that_is_not_here');

describe('the rules a project holds, and the file holding each one', () => {
	it('reads all seven, in the order the table gives them', () => {
		strictEqual(
			read_the_rules(the_project).the_rules.length,
			7,
			'the rules table has seven rows and a different number were read, so a row is being lost or invented',
		);
	});

	it('answers three ways, because a rule held by lint is not a rule held by nothing', () => {
		const the_rules = read_the_rules(the_project).the_rules;
		const the_by_a_test_file = the_rules.find((a_rule) => a_rule.rule.includes('a move is allowed'));
		strictEqual(
			the_by_a_test_file.the_file_holding_it,
			'tests/test_the_table_of_moves.py',
			'the file holding a rule was not read from the cell that names it',
		);
		strictEqual(
			the_by_a_test_file.is_there,
			true,
			'a rule is held by a file the fixture has, and the reader says it is not',
		);
		strictEqual(
			the_rules.find((a_rule) => a_rule.rule.includes('every module opens')).is_there,
			null,
			'a rule held by `ruff` was answered with a path check, and a program is not a file',
		);
		strictEqual(
			the_rules.find((a_rule) => a_rule.rule.includes('the default suite needs')).is_there,
			null,
			'a rule held by a setting in a manifest was answered with a path check',
		);
	});

	it('says a rule is held by nothing when the file it names is not there', () => {
		// **The point of the table.** A rule naming a file that does not exist is a rule
		// nobody is holding, and it looks exactly like a rule in a document.
		const the_rule = read_the_rules(the_project).the_rules.find((a_rule) =>
			a_rule.rule.includes('the operator'),
		);
		strictEqual(the_rule.the_file_holding_it, 'docs/how-to-operate.md', 'the file the rule names was not read');
		strictEqual(the_rule.is_there, false, 'a rule naming a missing file is reported as held');
	});

	it('says a document that is not published in words, and not as an empty table', () => {
		const the_answer = read_the_rules(the_project_that_is_not_here);
		strictEqual(the_answer.was_read, false, 'a rules table was read from a tree that has no AGENTS.md');
		deepEqualsNothing(the_answer.the_rules);
		match(the_answer.why_not, /AGENTS\.md/, 'the reason does not name the file that was looked for');
	});
});

describe('the dependencies, and the reason above them', () => {
	it('reads both, with the constraint each one carries', () => {
		const the_manifest = read_the_manifest(the_project);
		strictEqual(the_manifest.the_dependencies.length, 2, 'the manifest declares two and a different number were read');
		strictEqual(the_manifest.the_dependencies[0].name, 'httpx', 'the first dependency is not the first in the file');
		strictEqual(the_manifest.python, '>=3.12', 'the python the manifest asks for was not read');
	});

	it('carries the prose above them, because that is the reason and not a description', () => {
		const the_manifest = read_the_manifest(the_project);
		ok(
			the_manifest.what_it_says_about_its_dependencies.length > 0,
			'the argument for the dependencies was dropped, and it is the one part no other repository can supply',
		);
		match(
			the_manifest.what_it_says_about_its_dependencies,
			/a cost with no caller is a defect/,
			'the prose above the dependencies was not the file\'s',
		);
	});

	it('reads the tiers the default suite keeps out, because a tier that is not listed is not deselected', () => {
		const the_manifest = read_the_manifest(the_project);
		strictEqual(
			the_manifest.the_markers.join(','),
			'e2e,ui,integration',
			'the markers were not read, and a page cannot print a tier list it has not been told about',
		);
	});
});

describe('what the continuous integration runs, and what a visitor may run', () => {
	it('names the workflow and its steps', () => {
		const the_workflows = read_the_workflows(the_project);
		strictEqual(the_workflows.was_read, true, 'the workflow was not read');
		strictEqual(the_workflows.the_workflows[0].name, 'gate', 'the workflow is not named by its own name');
		ok(
			the_workflows.the_workflows[0].the_steps.includes('the gate'),
			`the steps are ${JSON.stringify(the_workflows.the_workflows[0].the_steps)} and do not include the one that runs anything`,
		);
	});

	it('reads the shell blocks a visitor may run, and nothing else in the readme', () => {
		const the_blocks = read_what_a_visitor_may_run(the_project).the_blocks;
		ok(the_blocks.length > 0, 'the readme has shell blocks and none were read');
		ok(
			the_blocks.some((a_block) => a_block.join('\n').includes('scripts/gate')),
			'the one command the readme gives was not read',
		);
	});
});

describe('the licence, in the file\'s own words', () => {
	it('prints the first line and does not recognise it as permissive', () => {
		const the_licence = read_the_licence(the_project);
		strictEqual(the_licence.name, 'All Rights Reserved', 'the licence is not named in the file\'s own words');
		strictEqual(
			the_licence.name.includes('MIT'),
			false,
			'a licence was recognised rather than read, and recognising one is how a page reports a project as open source when it is not',
		);
	});

	it('says a licence that is not there is not stated, and does not guess one', () => {
		const the_licence = read_the_licence(the_project_that_is_not_here);
		strictEqual(the_licence.is_stated, false, 'a licence was read from a tree that has none');
		strictEqual(the_licence.name, null, 'a tree with no licence reported one, and `null` is not "probably MIT"');
	});
});

/** Assert that a list holds nothing, without importing the whole of `node:assert/strict`. */
function deepEqualsNothing(the_list) {
	ok(Array.isArray(the_list), 'the answer is not a list');
	strictEqual(the_list.length, 0, `a document that is not published reported ${the_list.length} rows`);
}
