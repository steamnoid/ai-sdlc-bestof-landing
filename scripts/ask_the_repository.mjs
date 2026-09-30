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
import { read_the_history } from './read_the_git_history.mjs';
import { read_what_github_says } from './read_github.mjs';
import { read_where_it_came_from } from './read_where_it_came_from.mjs';
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
export async function collect_everything_about(at, { owner, name, this_page, was_the_suite_asked_for = null, github_api = null }) {
	const the_interpreter = the_interpreter_to_read_the_code_with(at);

	const the_layers = this_reads('the layers a package declares', () =>
		ask_a_python_reader('scripts/ask_the_layers.py', at, the_interpreter),
	);
	const the_code = this_reads('the domain a project declares', () =>
		ask_a_python_reader('scripts/ask_the_code.py', at, the_interpreter),
	);

	// **Three columns, and the caller is handed all three.** The layers were declared by a
	// docstring, counted on a disk, and counted in the project's own index — the last two
	// being the same set on a clean checkout and differing on exactly the files a developer
	// has not committed.
	const the_layers_answered = {
		the_declared: the_layers.the_layers,
		on_disk: what_is_on_disk(at, the_layers.the_layers),
		in_the_project: what_the_project_holds(at, the_layers.the_layers),
	};

	const the_glossary = read_the_glossary(at);

	// **Every published claim about a refusal, checked against the tree — and only when a
	// glossary was published.** A project with no glossary has no claims, and a check over
	// an empty list is a check that would report every project as perfect.
	const the_claims = the_glossary.was_read
		? the_glossary.the_refusals.map((a_refusal) => ({
				...a_refusal,
				the_files_that_declare_it: where_a_name_is_declared(at, a_refusal.name)
					.the_files_that_declare_it,
			}))
		: [];
	const how_a_claim_was_checked =
		the_claims.length === 0
			? null
			: where_a_name_is_declared(at, the_claims[0].name).how_it_was_looked_for;

	return {
		this_page: {
			owner,
			name: this_page,
			url: `https://github.com/${owner}/${this_page}`,
		},
		the_project: {
			owner,
			name,
			address: `https://github.com/${owner}/${name}`,
			on_disk: at,
			which_code_answered: the_code.which_code_answered,
			read_with: the_interpreter,
		},
		the_build: { read_at: new Date().toISOString() },
		the_layers: the_layers_answered,
		the_domain: the_code,
		the_glossary,
		// **Five documents, each carried with its own answer.** They are not merged into one
		// `the_documents` because a merged field is a field whose absence means all five at
		// once, and each of these is published or not on its own.
		the_manifest: read_the_manifest(at),
		the_rules: read_the_rules(at),
		the_workflows: read_the_workflows(at),
		the_commands_a_visitor_may_run: read_what_a_visitor_may_run(at),
		the_licence: read_the_licence(at),
		the_built_column: what_the_built_column_says(the_claims, how_a_claim_was_checked),
		the_claims_about_the_stages: what_the_glossary_says_about_the_stages(
			the_glossary.was_read ? the_glossary.the_stages : null,
			the_code.stages,
		),
		the_order: what_the_order_says(
			the_glossary.was_read ? the_glossary.the_stages.map((a_stage) => a_stage.name) : null,
			the_code.stages.map((a_stage) => a_stage.name),
		),
		the_history: read_the_history(at),
		where_it_came_from: read_where_it_came_from(at),
		the_github: await read_what_github_says(github_api, owner, name),
		the_suite: read_the_suite(at, { was_it_asked_for: was_the_suite_asked_for }),
	};
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
