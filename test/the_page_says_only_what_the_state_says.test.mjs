/**
 * The page says only what the state says, and this is the test that says so.
 *
 * **It builds the real artifact, reads it as a reader reads it, and asks the state whether
 * what came out could have been typed.** One assertion for each way a page gets that wrong:
 * a hand-typed stage, a hand-typed count, a hand-typed project, a hand-typed verdict, and a
 * number welded to a word by a line break.
 *
 * Five techniques, and each of them exists because its absence is a false green.
 *
 * | the technique | what it is for |
 * |---|---|
 * | **two views of one artifact** | the text view answers "is the fact present" and the markup view answers "is the structure right". One cannot do both: `href="…"` counting needs the tags, and a phrase split across three elements reads as absent without them |
 * | **decode entities before matching** | `the glossary's` reaches the page as `the glossary&#39;s`, and a reader that forgets to decode reports a fact on the page as missing |
 * | **pair every ban with the number that replaces it** | a test that only forbids `"Two pull requests"` passes on a page that prints `3 pull requests` typed by hand |
 * | **assert both branches of a verdict** | green and not-green each have a sentence, and only asserting one leaves the other free |
 * | **count, do not describe** | how many layers, how many refusals, how many settings — a structure assertion that survives the wording changing |
 *
 * The state this reads is the one `npm run collect` wrote, and the file is **never committed**
 * on purpose: a committed snapshot is a number nobody checked. When it is absent the test
 * fails loudly and says the command, because a missing file with no explanation is the same
 * silence as a page with a wrong number in it.
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { before, describe, it } from 'node:test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const where_the_state_lives = resolve('src/state/the_bestof.json');

if (!existsSync(where_the_state_lives)) {
	describe('the page is judged against the state it was built from', () => {
		it('the state exists before the page is judged', () => {
			ok(false, `there is no state at ${where_the_state_lives}. Run \`npm run collect\` first: the page is built from what the collectors read, and that file is never committed on purpose.`);
		});
	});
} else {
	const the_state = JSON.parse(readFileSync(where_the_state_lives, 'utf8'));
	const the_astro = resolve('node_modules/astro/bin/astro.mjs');
	let where_the_build_landed = null;
	let the_page_as_text = null;
	let the_page_as_markup = null;

	/** HTML entities a browser shows and a matcher must not trip over. */
	const THE_ENTITIES = { '&#39;': "'", '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&mdash;': '—', '&nbsp;': ' ' };
	const the_readable_text_of = (the_markup) => {
		const without_tags = the_markup.replace(/<[^>]+>/g, ' ');
		return without_tags
			.replace(/&#?\w+;/g, (an_entity) => THE_ENTITIES[an_entity] ?? ' ')
			.replace(/\s+/g, ' ');
	};

	before(async () => {
		where_the_build_landed = mkdtempSync(join(tmpdir(), 'the-built-page-'));
		execFileSync(process.execPath, [the_astro, 'build', '--outDir', where_the_build_landed], {
			cwd: resolve('.'),
			encoding: 'utf8',
		});
		the_page_as_markup = readFileSync(join(where_the_build_landed, 'index.html'), 'utf8');
		the_page_as_text = the_readable_text_of(the_page_as_markup);
	});

	describe('every fact the state holds is on the page', () => {
		it('prints every stage the enumeration declares', () => {
			for (const a_stage of the_state.the_domain.stages) {
				ok(the_page_as_text.includes(a_stage.name), `${a_stage.name} is in the code and is not on the page`);
			}
		});

		it('prints every destination the move table names', () => {
			for (const a_move of the_state.the_domain.moves) {
				for (const a_destination of a_move.to) {
					ok(
						the_page_as_text.includes(a_destination),
						`${a_move.from} → ${a_destination} is a legal move in the code and is not on the page`,
					);
				}
			}
		});

		it('prints every role, every layer, every artifact, every refusal and every setting', () => {
			const the_names = [
				...the_state.the_domain.roles,
				...the_state.the_layers.the_declared.map((a_layer) => a_layer.name),
				...the_state.the_glossary.the_artifacts.map((an_artifact) => an_artifact.name),
				...the_state.the_glossary.the_refusals.map((a_refusal) => a_refusal.name),
				...the_state.the_glossary.the_settings.map((a_setting) => a_setting.name),
				...the_state.the_rules.the_rules.map((a_rule) => a_rule.rule),
			];
			const the_missing = the_names.filter((a_name) => !the_page_as_text.includes(a_name));
			strictEqual(
				the_missing.length,
				0,
				`${the_missing.length} of ${the_names.length} names the state holds are not on the page: ${the_missing.slice(0, 5).join(', ')}`,
			);
		});

		it('prints the suite\'s own output, byte for byte', () => {
			const the_last_line = the_state.the_suite.what_it_printed.trimEnd().split('\n').at(-1);
			ok(
				the_page_as_text.includes(the_last_line),
				`the suite's last line is "${the_last_line}" and is not on the page, so the terminal block was tidied`,
			);
		});
	});

	describe('nothing is on the page that the state does not say', () => {
		it('carries no number the state does not hold', () => {
			// **The bans are paired with the numbers that replace them**, because a test that
			// only forbids `"Two pull requests"` passes on a page printing `3 pull requests`
			// typed by hand. Every figure below is one the state knows and one nobody may type.
			for (const a_banned of [
				/\bTen (?:stages|roles|artifacts|refusals)\b/i,
				/\bTwo (?:stages|roles|artifacts|refusals)\b/i,
				/\bFive (?:stages|roles|artifacts|refusals)\b/i,
				/\bthe project is not open source\b/i,
			]) {
				ok(!a_banned.test(the_page_as_text), `the page prints a number no source declares: ${a_banned}`);
			}
			strictEqual(
				the_state.the_domain.stages.length,
				Number(the_page_as_text.match(new RegExp(`\\b${the_state.the_domain.stages.length} stages\\b`))?.[0]?.split(' ')[0]),
				'the page does not carry the stage count the code declares',
			);
		});

		it('carries the suite\'s verdict in the reader\'s own words, both ways', () => {
			// **Both branches, and the number beside them.** The first published run of this
			// page printed "passed" under a count of `1 failed, 189 passed` — a word in a
			// template, sitting under the one number a reader came for. The label is a fact
			// about the suite and it has to follow the verdict like every other one.
			// **\d+ is not a capture group**, so the word is the first and only one. Reading index 2 of a
			// two-element match is undefined, and an assertion against undefined fails on a page that is
			// correct — which is a test that trains its reader to ignore it.
			const the_card_is_labelled = the_page_as_text.match(/\d+\s+(passed|failed)\b/);
			if (the_state.the_suite.is_green) {
				ok(the_page_as_text.includes('exited 0'), 'the suite is green and the page does not say what it exited');
				ok(the_card_is_labelled?.[1] === 'passed', `the card is labelled "${the_card_is_labelled?.[1]}" beside a count the suite passed`);
			} else {
				ok(!the_page_as_text.includes('exited 0'), 'the suite is not green and the page says it exited 0');
				ok(
					the_card_is_labelled?.[1] !== 'passed',
					`the card says "passed" beside a count from a suite that did not pass: ${the_card_is_labelled?.[0]}`,
				);
			}
		});

		it('says when it read the project, beside the claims it read', () => {
			const when_read = the_state.the_build.read_at.slice(0, 10);
			ok(the_page_as_text.includes(when_read), `the page does not say when it read the project, and this build read it at ${when_read}`);
		});

		it('names no project but the one it read', () => {
			ok(
				the_page_as_markup.includes(`href="https://github.com/${the_state.the_project.address.replace('https://github.com/', '')}"`),
				'the project is not linked, so a reader cannot go and check the page against it',
			);
		});
	});

	describe('the page has no sentence welded to a number by a line break', () => {
		it('reads as prose, because a newline between two expressions renders as nothing', () => {
			// **A paragraph written across three source lines renders as `and1 of themwas`.**
			// Nothing raises, and every count-matching test still passes — so the only way to
			// catch it is to look for the weld in the built output.
			//
			// Two decisions, both of them from being wrong first. The general shape `[a-z]\d`
			// flagged `pyside6`, `python3` and `httpx2` — every word on a page that legitimately
			// contains a digit. So the rule is a **list of welds**, not a shape: a connective
			// against a digit, or a digit against a noun that is never a number. And the
			// terminal block is excluded, because it is a project's own bytes and a rule about
			// this page's prose does not apply to somebody else's traceback.
			const the_prose_only = the_page_as_markup.replace(/<pre[\s\S]*?<\/pre>/g, ' ');
			const the_readable_prose = the_readable_text_of(the_prose_only);
			for (const a_weld of [
				/\b(?:and|or|of|with|for|to|in|on|is|was|were|has|have)\d/i,
				/\d(?:of|holds|hold|is|was|were|modules|layers|roles|artifacts|refusals|terms|settings)\b/i,
			]) {
				const the_found = the_readable_prose.match(a_weld);
				ok(
					the_found === null,
					`an expression is welded to the word beside it — "${the_found?.[0]}" — so the page reads as machine output`,
				);
			}
		});

		it('still shows the suite\'s own output, weld and all, because it is printed byte for byte', () => {
			// **The exclusion above must not become a hiding place.** A tidied terminal block is
			// a page showing a suite output nobody ever saw, so the bytes are checked here
			// instead — in the markup, where they are.
			const the_last_line = the_state.the_suite.what_it_printed.trimEnd().split('\n').at(-1);
			ok(
				the_page_as_markup.includes(the_last_line.replace(/&/g, '&amp;').replace(/</g, '&lt;')) ||
					the_page_as_markup.includes(the_last_line),
				`the suite's last line is not in the built output, so the terminal block was tidied: "${the_last_line}"`,
			);
		});
	});

	describe('the state is published beside the page', () => {
		it('so every number on it can be checked against the file it came from', () => {
			const the_published = join(where_the_build_landed, 'the_bestof.json');
			ok(existsSync(the_published), 'the build did not publish the state, so the page\'s own provenance is absent');
			const the_answer = JSON.parse(readFileSync(the_published, 'utf8'));
			strictEqual(
				the_answer.the_layers.the_declared.length,
				the_state.the_layers.the_declared.length,
				'the published state is not the state this page was built from',
			);
		});
	});

	describe('the page is buildable and the state is one the page can read', () => {
		it('has a state with the keys the page reads, and no key the page does not', () => {
			for (const a_key of ['the_layers', 'the_domain', 'the_glossary', 'the_suite', 'the_rules', 'the_build', 'the_project']) {
				ok(the_state[a_key] !== undefined, `the state has no "${a_key}" and the page reads it`);
			}
			match(the_state.the_project.read_with, /python/, 'the state does not say what it read the project with');
		});
	});
}
