/**
 * The glossary's `Built` column is a claim the project makes about itself, and this is where
 * the tree is held to it.
 *
 * | the glossary says | the tree holds | verdict | what it means |
 * |---|---|---|---|
 * | built | declared | `the claim holds` | the promise was kept |
 * | built | nothing | `the claim is refuted` | **a refusal the project says exists and nothing declares** |
 * | not yet | nothing | `the claim holds` | an ordinary promise |
 * | not yet | declared | `the claim understates` | the tree has more than the document says |
 *
 * **The two disagreements are never merged, and never share a sentence.** A page that
 * reported both as "not built" would say a project that quietly built something did not build
 * it — and the direction is the one fact a reader cannot recover from a summary. A sibling
 * page has one "disagreement" for both directions for exactly that reason.
 *
 * The refuted one is the section. The other two are what keep it credible: a check that
 * refutes every claim is a page that has stopped being useful, and this file's test asserts
 * all three outcomes appear in the fixture.
 *
 * **`how_it_was_looked_for` is carried through and never dropped.** The check is weaker than
 * the one the project runs on itself — a declaration is not a raise — and a page that dropped
 * that sentence would be claiming the stronger check by silence.
 */

const a_count_of = (how_many) => String(how_many);
const a_list_of = (the_names) => (the_names.length === 1 ? '1 name' : `${the_names.length} names`);

/**
 * What the tree holds against what the document claims about itself.
 *
 * @param {Array<{name: string, is_built: boolean, the_files_that_declare_it: string[]}>} the_claims
 * @param {string} how_it_was_looked_for - the reader's own account of its check
 * @returns {{verdict: string, how_many_are_refuted: number, how_many_are_understated: number,
 *   how_many_the_claim_holds: number, the_refused_claims: Array<{name: string, verdict: string,
 *   detail: string}>, how_it_was_checked: string, detail: string}}
 */
export function what_the_built_column_says(the_claims, how_it_was_looked_for) {
	const the_judged = the_claims.map((a_claim) => ({
		name: a_claim.name,
		is_declared: a_claim.the_files_that_declare_it.length > 0,
		...a_claim,
	}));

	const the_refuted = the_judged.filter((a_claim) => a_claim.is_built && !a_claim.is_declared);
	const the_understated = the_judged.filter((a_claim) => !a_claim.is_built && a_claim.is_declared);
	const the_held = the_judged.filter((a_claim) => a_claim.is_built === a_claim.is_declared);

	return {
		verdict:
			the_refuted.length > 0
				? `${a_count_of(the_refuted.length)} claim${the_refuted.length === 1 ? ' is' : 's are'} refuted`
				: the_understated.length > 0
					? `${a_count_of(the_understated.length)} claim${the_understated.length === 1 ? '' : 's'} understate what the tree holds`
					: 'every claim holds',
		how_many_are_refuted: the_refuted.length,
		how_many_are_understated: the_understated.length,
		how_many_the_claim_holds: the_held.length,
		// **The two disagreements, each in its own words.** `the claim is refuted` says the
		// document is wrong; `the claim understates` says the tree is ahead of it. A page
		// that printed one string for both has told a reader that a project built nothing
		// when it built something.
		the_refused_claims: [
			...the_refuted.map((a_claim) => ({
				name: a_claim.name,
				verdict: 'the claim is refuted',
				detail: 'The glossary says this refusal is built and nothing under src/ declares it.',
			})),
			...the_understated.map((a_claim) => ({
				name: a_claim.name,
				verdict: 'the claim understates',
				detail:
					'The glossary calls this one a promise and the tree declares it. The document is ' +
					'behind the code, which is the direction that never causes a wrong build.',
			})),
		],
		how_it_was_checked: how_it_was_looked_for,
		detail:
			`${a_count_of(the_judged.length)} named in the glossary's Built column: ` +
			`${a_count_of(the_held.length)} hold, ${a_count_of(the_refuted.length)} ${the_refuted.length === 1 ? 'is' : 'are'} ` +
			`refuted, and ${a_count_of(the_understated.length)} ${the_understated.length === 1 ? 'understates' : 'understate'} ` +
			`what the tree already holds.`,
	};
}
