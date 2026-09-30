/**
 * A fact becomes a sentence here, and nowhere else.
 *
 * **This file is the only place in the repository allowed to turn a number into a claim.**
 * `index.astro` may not contain a stage name, a role name, a count, or a verdict — and a
 * test builds the page and reads it back to prove it. The reason is a sibling page that
 * carried three sentences its author typed by hand, one of them "Two pull requests",
 * written by the person who wrote the test that was supposed to catch it.
 *
 * Every answer carries a `verdict` from a closed vocabulary, because the shapes below are
 * confusable and a page about a project mid-build confuses them constantly:
 *
 * | the two that get confused | what separates them |
 * |---|---|
 * | `green` and `not green` | the exit code, and not the number of passes beside it |
 * | `not run` and `not green` | nobody asked, or it failed. These are different facts |
 * | `a directory and nothing in it` and `no directory` | somebody made it, or nobody did |
 * | `held by a tool` and `held by nothing` | `null` and not `false` |
 * | `not published` and `there is none to publish` | the document is missing, or it is empty |
 *
 * **Every sentence is assembled here, whole.** A paragraph written across three source lines
 * renders as `and1 of themwas written` — nothing raises, and every count-matching test still
 * passes — so a sentence with more than one thing to say is built in this file, where the
 * spaces are characters and not layout.
 *
 * **A refusal is a value and never an absence.** Each of these returns a sentence for a fact
 * it could not read, because a field that is simply missing on a page reads as a project with
 * nothing to report, and that is the one thing a page about unfinished work must never do.
 */

/** A number and its noun, and never a figure welded to a label by a line break. */
const a_count_of = (how_many, the_one, the_many) => `${how_many} ${how_many === 1 ? the_one : the_many}`;

/** A list a person can read aloud: `A`, `A and B`, `A, B and C`. */
const a_list_of = (the_names) => {
	if (the_names.length <= 1) return the_names.join('');
	if (the_names.length === 2) return the_names.join(' and ');
	return `${the_names.slice(0, -1).join(', ')} and ${the_names.at(-1)}`;
};

/** A list in backticks, because every one of them is an identifier and reads as one. */
const as_identifiers = (the_names) => a_list_of(the_names.map((a_name) => `\`${a_name}\``));

/**
 * What the three layer columns say together.
 *
 * @param {{the_declared: object[], on_disk: object[], in_the_project: object[]}} the_layers
 * @returns {{verdict: string, how_many_hold_code: number, how_many_were_declared: number,
 *   detail: string, the_rows: object[]}}
 */
export function what_the_layers_say(the_layers) {
	const { the_declared, on_disk, in_the_project } = the_layers;
	const with_code = in_the_project.filter((a_layer) => a_layer.how_many_modules > 0);
	const how_many_modules = in_the_project.reduce(
		(total, a_layer) => total + (a_layer.how_many_modules ?? 0),
		0,
	);

	// **Three columns, and the rows carry the disagreement rather than a verdict about it.**
	// A layer declared and holding a subdirectory is not a layer with code in it, and a layer
	// declared and absent is not a layer somebody emptied — the page draws both and says which
	// is which in words, because a single number over the three cannot.
	const the_rows = the_declared.map((a_declared) => {
		const the_on_disk = on_disk.find((a_layer) => a_layer.name === a_declared.name);
		const in_the_project_here = in_the_project.find((a_layer) => a_layer.name === a_declared.name);
		return {
			name: a_declared.name,
			what_it_holds: a_declared.what_it_holds,
			verdict:
				!the_on_disk.is_a_directory
					? 'declared and not there'
					: (in_the_project_here.how_many_modules ?? 0) > 0
						? 'holds code'
						: 'a directory and nothing in it',
			how_many_modules: in_the_project_here.how_many_modules,
		};
	});

	return {
		verdict: `${a_count_of(with_code.length, 'layer holds', 'layers hold')} code`,
		how_many_hold_code: with_code.length,
		how_many_were_declared: the_declared.length,
		how_many_modules,
		detail:
			`${a_count_of(the_declared.length, 'layer is', 'layers are')} declared in the package's own ` +
			`docstring, and ${a_count_of(with_code.length, 'holds', 'hold')} code in the project itself — ` +
			`${a_count_of(how_many_modules, 'module', 'modules')} in all. The two numbers differ, and the ` +
			`difference is the project's own thesis: it was learned from four repositories that shipped ` +
			`code nothing imported.`,
		the_rows,
	};
}

/**
 * What the suite said, in words.
 *
 * @param {{was_run: boolean, is_green: boolean, passed: number|null, failed: number|null,
 *   why_not: string|null, exit_code?: number}} the_suite
 * @returns {{verdict: string, detail: string, what_it_printed: string|null}}
 */
export function what_the_suite_says(the_suite) {
	if (!the_suite.was_run) {
		return { verdict: 'not run', detail: the_suite.why_not, what_it_printed: null };
	}
	// **`exit 0` and nothing else.** The passes are printed beside it and are not the claim.
	// A run that printed `1 failed, 449 passed` is a run that failed, and a page that leads
	// with the passes is leading with the part it likes.
	const the_counts =
		the_suite.passed === null && the_suite.failed === null
			? 'it printed no counts'
			: `${the_suite.passed ?? '?'} passed${the_suite.failed && the_suite.failed !== '0' ? `, ${the_suite.failed} failed` : ''}`;
	return {
		verdict: the_suite.is_green ? 'green' : 'not green',
		detail: the_suite.is_green
			? `the suite exited 0, and only an exit code of 0 is green: ${the_counts}`
			: the_suite.why_not,
		what_it_printed: the_suite.what_it_printed,
	};
}

/**
 * What the rules table says, and which of its rules nothing holds.
 *
 * @param {{was_read: boolean, the_rules: object[], why_not: string|null}} the_rules
 * @returns {{verdict: string, how_many_nothing_holds: number, detail: string, the_rules: object[]}}
 */
export function what_the_rules_say(the_rules) {
	if (!the_rules.was_read) {
		return { verdict: 'not published', how_many_nothing_holds: 0, detail: the_rules.why_not, the_rules: [] };
	}
	// **Three states and a boolean has two.** A rule held by lint is held; a rule naming a
	// file that is not there is held by nothing; and `null` is a rule no file holds at all.
	// The last two are different and a page that merges them reports a project as unguarded.
	const the_unheld = the_rules.the_rules.filter((a_rule) => a_rule.is_there === false);
	const the_by_a_tool = the_rules.the_rules.filter((a_rule) => a_rule.is_there === null);

	return {
		verdict:
			the_unheld.length > 0
				? `${a_count_of(the_unheld.length, 'rule is', 'rules are')} held by nothing`
				: 'every rule is held',
		how_many_nothing_holds: the_unheld.length,
		detail:
			`${a_count_of(the_rules.the_rules.length, 'rule', 'rules')} are held by a file or by a tool, ` +
			`and ${a_count_of(the_unheld.length, 'names', 'name')} a file that is not there` +
			(the_unheld.length > 0 ? `: ${as_identifiers(the_unheld.map((a_rule) => a_rule.the_file_holding_it))}.` : '.') +
			` ${a_count_of(the_by_a_tool.length, 'is', 'are')} held by a tool rather than a file, which is a ` +
			`rule held and not a rule unheld.`,
		the_rules: the_rules.the_rules,
	};
}

/**
 * What the project publishes about itself that is not code, a document or a suite.
 *
 * @param {object} the_state
 * @returns {object} one answer per fact, each with a sentence
 */
export function what_the_rest_says(the_state) {
	const the_glossary = the_state.the_glossary;
	const the_manifest = the_state.the_manifest;
	const the_workflows = the_state.the_workflows;

	return {
		the_glossary_says: {
			verdict: the_glossary.was_read ? 'published' : 'not published',
			detail: the_glossary.was_read
				? `${a_count_of(the_glossary.the_terms_it_blesses.length, 'term', 'terms')}, ` +
					`${a_count_of(the_glossary.the_artifacts.length, 'artifact', 'artifacts')}, ` +
					`${a_count_of(the_glossary.the_refusals.length, 'refusal', 'refusals')}, ` +
					`${a_count_of(the_glossary.the_settings.length, 'setting', 'settings')} and ` +
					`${a_count_of(the_glossary.the_words_it_refuses.length, 'banned word', 'banned words')}, ` +
					`read under ${a_count_of(the_glossary.how_the_file_says_it_is_read.length, 'rule of its own', 'rules of its own')}.`
				: the_glossary.why_not,
		},
		the_stack_says: {
			verdict: the_manifest.was_read ? 'read' : 'not published',
			detail: the_manifest.was_read
				? `${the_manifest.python} and ${a_count_of(the_manifest.the_dependencies.length, 'dependency', 'dependencies')}, ` +
					`and ${a_count_of(the_manifest.the_markers.length, 'real tier', 'real tiers')} the default suite keeps out.`
				: the_manifest.why_not,
			the_dependencies: the_manifest.the_dependencies,
			what_the_project_says_about_them: the_manifest.what_it_says_about_its_dependencies,
		},
		the_ci_says: {
			verdict: the_workflows.was_read ? 'counted' : 'no workflow',
			detail: the_workflows.was_read
				? `${a_count_of(the_workflows.the_workflows.length, 'workflow', 'workflows')}, ` +
					`running ${a_count_of(the_workflows.the_workflows.flatMap((a_workflow) => a_workflow.the_steps).length, 'step', 'steps')}.`
				: the_workflows.why_not,
		},
		the_licence_says: {
			verdict: the_state.the_licence.is_stated ? 'stated' : 'not stated',
			// **The file's own words and never recognised.** `All Rights Reserved` is a real
			// licence file; a reader that recognised it as permissive would report a project
			// as open source when it is not.
			detail: the_state.the_licence.is_stated
				? `The licence file says ${the_state.the_licence.name}.`
				: 'There is no licence file, and a project with none has not published one that a reader could quote.',
			name: the_state.the_licence.name,
		},
	};
}
