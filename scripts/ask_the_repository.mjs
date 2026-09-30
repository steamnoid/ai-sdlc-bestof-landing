/**
 * Everything the page may say about one project, in one object — and the policy for what
 * happens when a reader refuses.
 *
 * **One file, written once, at the end, or not written.** A collector that refuses halfway
 * leaves a half-answer on disk, and a page built from a half-answer is a page that cannot
 * say which half it has. The sibling page this is written after learned that one level down
 * than its author expected: it wrote each project's answer as it went, one of four projects
 * failed to read, and three quarters of a page went out looking complete.
 *
 * | a reader refuses | this collector does |
 * |---|---|
 * | the layers, the code, the suite | **stop, name it, and write nothing** |
 * | a document that is not published | carry the value and the reason, and carry on |
 * | a gate map that is not there | carry `null` and the reason, and carry on |
 *
 * That table is the whole policy, and it is the distinction the page's every section rests
 * on. **A fact a project does not have is a fact. A fact this page could not read is a
 * fault.** The two must never take the same path, because a page that renders a fault as an
 * absence is a page reporting a project as emptier than it is — which is the one wrong
 * sentence a page about unfinished work may never print.
 *
 * The Python readers run on the checkout's own interpreter, because the domain imports
 * pydantic and a system `python3` cannot import it. That is not hypothetical: it is what
 * happened the first time the code reader was run by hand, and it reported the project's
 * health as a fact about the laptop.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { ask_a_python_reader, the_interpreter_to_read_the_code_with } from './ask_a_python_reader.mjs';
import {
	read_the_licence,
	read_the_manifest,
	read_the_rules,
	read_what_a_visitor_may_run,
	read_the_workflows,
} from './read_the_documentation.mjs';
import { read_the_glossary } from './read_the_glossary.mjs';
import { what_is_on_disk } from './read_the_layers_on_disk.mjs';
import { read_the_suite } from './read_the_suite.mjs';
import { what_the_project_holds } from './read_what_the_project_holds.mjs';
import { where_a_name_is_declared } from './read_where_a_name_is_declared.mjs';
import { what_the_built_column_says } from '../src/page/what_the_built_column_says.mjs';
import {
	what_the_glossary_says_about_the_stages,
	what_the_order_says,
} from '../src/page/what_the_glossary_says.mjs';

/** A project this page could not read, named by the rule rather than by a symptom. */
export class TheProjectCouldNotBeReadError extends Error {
	constructor(which_reader, why) {
		super(`${which_reader} refused, and a page built from a half-answer is a page that lies: ${why}`);
		this.name = 'TheProjectCouldNotBeReadError';
		this.which_reader = which_reader;
	}
}

/**
 * Everything the page may say about one project.
 *
 * @param {string} at - a checkout of the project
 * @param {{owner: string, name: string, this_page: string, was_the_suite_asked_for: string|null}} about
 * @returns {object} the state, which this function builds and never writes
 */
export function collect_everything_about(at, about) {
	throw new TheProjectCouldNotBeReadError(
		'the whole project',
		`${at} was not read: this collector reads nothing yet.`,
	);
}

/** A reader, and the rule that a refusal of it is this collector's refusal. */
function this_reads(what, the_reader) {
	try {
		return the_reader();
	} catch (the_refusal) {
		throw new TheProjectCouldNotBeReadError(what, the_refusal.message);
	}
}

/**
 * Write the state, once, having collected all of it.
 *
 * @param {object} the_state
 * @param {string} where - the path to write to
 */
export function write_the_state(the_state, where) {
	mkdirSync(dirname(where), { recursive: true });
	// **Tab-indented, with a trailing newline.** This file is published beside the page for
	// anybody to check a number against, and a diff of it is something a person reads.
	writeFileSync(where, `${JSON.stringify(the_state, null, '\t')}\n`);
}
