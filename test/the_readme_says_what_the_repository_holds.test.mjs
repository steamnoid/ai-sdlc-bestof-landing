/**
 * The layout in the README is a claim about the repository, and it was wrong for one commit.
 *
 * `README.md` prints what the repository is made of: every script, every page module, the page
 * and the one state file. That is a **claim**, in the sense this repository uses the word — it
 * can be checked against the disk, and it was not.
 *
 * It drifted in the cycle that added the file. `scripts/keep_the_two_lists_in_step.mjs` was
 * written, tested, wired into `package.json` and pushed, and the README's list of what the
 * repository contains went on not mentioning it. **The same cycle, the same commit, the rule
 * this repository states for itself — documentation must match the code — broken in the act of
 * following everything else about it.**
 *
 * | the drift | what a reader is told |
 * |---|---|
 * | a file on disk and not in the list | it does not exist, or it was forgotten, and the reader cannot tell which |
 * | a name in the list and not on disk | it exists, and it is gone |
 * | both | the list is decorative, and every other line in it is decorative too |
 *
 * **The third row is why this is a test and not a habit.** A list that has already been wrong
 * once is a list that is not being read closely, and a habit is what produced the wrong list.
 * A test costs nothing at the moment a file is added, which is the only moment anybody would
 * have noticed by hand.
 *
 * The two directions are both checked, because **a test that only catches an addition is half a
 * claim**: a renamed file leaves a name behind that points at nothing, and that is the version
 * that reads as a typo rather than as a hole.
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const THE_REPOSITORY = dirname(dirname(fileURLToPath(import.meta.url)));

/** Every source file the README's layout block is claiming to account for. */
const WHAT_THE_REPOSITORY_HOLDS = () =>
	execFileSync('git', ['ls-files', 'scripts/', 'src/page/'], { cwd: THE_REPOSITORY, encoding: 'utf8' })
		.split('\n')
		.filter((a_name) => /\.(mjs|py)$/.test(a_name))
		.map((a_name) => a_name.split('/').pop())
		.sort();

/** The layout block: the fenced one between the headings that open and close it. */
const the_layout_block = () => {
	const the_readme = readFileSync(join(THE_REPOSITORY, 'README.md'), 'utf8');
	const what_it_says = the_readme.split('```text')[1]?.split('```')[0];
	ok(what_it_says !== undefined, 'the README has no ```text block, so there is no layout to check');
	return what_it_says;
};

describe('the README’s layout is the repository', () => {
	it('names every file there is', () => {
		const what_it_says = the_layout_block();
		const the_missing = WHAT_THE_REPOSITORY_HOLDS().filter((a_name) => !what_it_says.includes(a_name));
		strictEqual(
			the_missing.join(', '),
			'',
			`${the_missing.join(', ')} exists in the repository and is not in the README's layout, and a reader is left to guess whether it matters`,
		);
	});

	it('names nothing that is not there', () => {
		const what_it_says = the_layout_block();
		const what_is_there = WHAT_THE_REPOSITORY_HOLDS();
		const the_absent = [...what_it_says.matchAll(/([a-z_0-9]+\.(?:mjs|py))\b/g)]
			.map((a_match) => a_match[1])
			.filter((a_name) => !what_is_there.includes(a_name));
		strictEqual(
			the_absent.join(', '),
			'',
			`the README names ${the_absent.join(', ')}, which is not in the repository: a list with a name pointing at nothing is a list nobody reads`,
		);
	});

	it('and the page and the state, which are the two files that are not scripts', () => {
		const what_it_says = the_layout_block();
		match(what_it_says, /src\/pages\/index\.astro/);
		match(what_it_says, /src\/state\/the_bestof\.json/);
	});
});
