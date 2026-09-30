// @ts-check
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const where_the_state_lives = 'src/state/the_bestof.json';
const what_stands_in_for_a_missing_one = '{\n\t"the_bestof": null\n}\n';

/**
 * Write the state the page is built from, and publish the one it was built from.
 *
 * **Three halves, and each exists because a sibling page lost it.** `ai-sdlc-os-landing`
 * published last month's test count because the state was committed; `ai-sdlc-landing` could
 * not be built from a fresh clone because `src/pages/index.astro` imports a JSON path that
 * no clone has; and a workflow step that copies the state ran in CI and nowhere else, so a
 * developer's `npm run build` and the published artifact were two different files under one
 * name.
 *
 * So: a missing state becomes a stand-in that says it is a stand-in, a build that read
 * nothing leaves nothing behind to be looked at later, and publishing is a hook rather than
 * a step, because the hook is the only part of a build that both a developer and CI run.
 */
const the_state_the_page_is_built_from = {
	name: 'the-state-the-page-is-built-from',
	hooks: {
		'astro:build:start': () => {
			if (!existsSync(where_the_state_lives)) {
				mkdirSync(dirname(where_the_state_lives), { recursive: true });
				writeFileSync(where_the_state_lives, what_stands_in_for_a_missing_one);
			}
		},
		'astro:build:done': async ({ dir, logger }) => {
			if (!existsSync(where_the_state_lives)) {
				logger.warn(
					`no state at ${where_the_state_lives}, so there is nothing to publish. Run \`npm run collect\` first.`,
				);
				return;
			}
			const the_state = readFileSync(where_the_state_lives, 'utf8');
			copyFileSync(where_the_state_lives, join(dir.pathname ?? dir, 'the_bestof.json'));
			if (the_state === what_stands_in_for_a_missing_one) {
				rmSync(where_the_state_lives, { force: true });
				logger.warn('the state was the stand-in saying it was one, so it was not published');
				return;
			}
			logger.info('published the_bestof.json');
		},
	},
};

export default defineConfig({
	site: 'https://steamnoid.github.io',
	base: '/ai-sdlc-bestof-landing',
	build: { format: 'file' },
	integrations: [the_state_the_page_is_built_from],
	vite: {
		plugins: [tailwindcss()],
	},
});
