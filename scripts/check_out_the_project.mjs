/**
 * Check the project out the way the page's build will, for a developer running it locally.
 *
 * **A shallow checkout reports a history of one commit, and the page would state a day's
 * work as a single commit in total confidence.** The page's history section counts RED and
 * GREEN commits and pairs them; a `--depth 1` clone gives it one commit and it would draw
 * one number for the whole project. So the clone here is whole, and so is the one in
 * `pages.yml` — the second is a shell line in a workflow, and this is the same line with a
 * sentence explaining it.
 *
 * The directory is **removed and made again**, because a reused directory blends two moments:
 * a second run would read the first run's state and report it as the project's history.
 *
 * | the variable | the default | what it is for |
 * |---|---|---|
 * | `AISDLC_OWNER` | `steamnoid` | whose project to read |
 * | `AISDLC_NAME` | `ai-sdlc-bestof` | which one |
 * | `AISDLC_BRANCH` | `main` | the branch as everybody else sees it |
 * | `AISDLC_FROM` | `https://github.com/…` | where to clone from |
 *
 * No secrets and no token: every repository read here is public, and a clone of a public
 * repository needs nothing.
 */

import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const the_owner = process.env.AISDLC_OWNER ?? 'steamnoid';
const the_name = process.env.AISDLC_NAME ?? 'ai-sdlc-bestof';
const the_branch = process.env.AISDLC_BRANCH ?? 'main';
const the_from = process.env.AISDLC_FROM ?? `https://github.com/${the_owner}/${the_name}.git`;
const where_it_lands = resolve(join(process.cwd(), 'build', 'the-repository'));

/**
 * Check the project out, whole, after removing whatever was there.
 *
 * @returns {{where: string, the_branch: string, the_from: string}}
 */
export function check_out_the_project() {
	// **Removed first, always.** A reused directory blends two moments: the second run reads
	// the first run's files and reports them as the project's history, and the page says when
	// it read — which would then be a lie about a directory it did not read.
	rmSync(where_it_lands, { recursive: true, force: true });
	try {
		// **No `--depth`.** A shallow clone is the fast way to get a build and it reports a
		// history of one commit, so the page's RED/GREEN pairing would be counted from a
		// single commit and drawn in total confidence.
		execFileSync('git', ['clone', '--quiet', '--branch', the_branch, the_from, where_it_lands], {
			encoding: 'utf8',
			stdio: ['ignore', 'inherit', 'inherit'],
		});
	} catch (the_failure) {
		process.stderr.write(
			`the project could not be checked out: ${the_failure.message}\n` +
				`  it was to come from ${the_from} on branch ${the_branch}\n` +
				`  set AISDLC_BRANCH if the branch moved, and AISDLC_FROM to read a fork\n`,
		);
		process.exitCode = 1;
		return { where: where_it_lands, the_branch, the_from };
	}
	process.stdout.write(`checked out ${the_from} at ${the_branch} into ${where_it_lands}\n`);
	return { where: where_it_lands, the_branch, the_from };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	check_out_the_project();
}
