/**
 * What GitHub says about a project, asked over HTTP and keeping a refusal as a value.
 *
 * **No call in this file throws.** The page must build whether or not the API answers, and a
 * reader that raised on a 403 would take the whole page down for the one fact it could not
 * read — which is the thing this page is most careful about everywhere else. A rate limit and
 * a revoked token shorten the page; they do not break it.
 *
 * | what is asked | what comes back |
 * |---|---|
 * | the repository's own description, stars, licence | the values the API gave |
 * | the check runs on the tip commit | a **count**, and `0` is a fact about the repository |
 * | a call that failed | `{ was_read: false, why_not: a sentence }` and never a throw |
 * | no API was named at all | the same refusal, naming the flag that would have asked |
 *
 * **`0` check runs is not the same as an unread one.** A repository with no continuous
 * integration is a fact the page can print; a repository whose check runs could not be read
 * is a fact it must not. The first is `0` and the second is `null`, and a page that rendered
 * both as "no workflow" would be claiming a project has no CI on the strength of a call that
 * failed.
 *
 * **The token is used when it is there and never demanded.** GitHub documents that using a
 * token against its REST API invites secondary rate limits, and every endpoint asked for here
 * is public — so the reader works without one and gets better answers with it.
 */

const THE_USER_AGENT = 'ai-sdlc-bestof-landing';

/** Ask one endpoint, and hand back a shape that is never an exception. */
const asking_the_api = async (the_api, what_was_asked) => {
	try {
		const the_answer = await fetch(`${the_api}${what_was_asked}`, {
			headers: {
				accept: 'application/vnd.github+json',
				'user-agent': THE_USER_AGENT,
				...(process.env.GITHUB_TOKEN
					? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
					: {}),
			},
		});
		if (!the_answer.ok) {
			return { was_read: false, why_not: `the API answered ${the_answer.status} for ${what_was_asked}` };
		}
		return { was_read: true, why_not: null, what_it_said: await the_answer.json() };
	} catch (the_failure) {
		return {
			was_read: false,
			why_not: `the API could not be reached (${the_failure.message}), so nothing was read about it`,
		};
	}
};

/**
 * What the API says about a repository, and whether it has continuous integration.
 *
 * @param {string|null} the_api - the API's address, or `null` when none was named
 * @param {string} owner
 * @param {string} name
 * @returns {Promise<object>} the values, or a refusal with a sentence
 */
export async function read_what_github_says(the_api, owner, name) {
	if (the_api === null) {
		return {
			was_read: false,
			why_not:
				'no API was named, so nothing was read about the repository or its checks. Pass ' +
				'--github-api to read them, and the page says which fields are missing until then.',
			url: `https://github.com/${owner}/${name}`,
			description: null,
			stars: null,
			the_licence_the_api_says: null,
			// **`null` and not `0`.** Nothing was asked, so nothing was counted; a zero here
			// would claim a project has no continuous integration on the strength of a call
			// nobody made.
			how_many_check_runs: null,
		};
	}

	const the_repository = await asking_the_api(the_api, `/repos/${owner}/${name}`);
	if (!the_repository.was_read) {
		return {
			was_read: false,
			why_not: the_repository.why_not,
			url: `https://github.com/${owner}/${name}`,
			description: null,
			stars: null,
			the_licence_the_api_says: null,
			how_many_check_runs: null,
		};
	}

	const the_branch = the_repository.what_it_said.default_branch ?? 'main';
	const the_checks = await asking_the_api(
		the_api,
		`/repos/${owner}/${name}/commits/${the_branch}/check-runs`,
	);

	return {
		was_read: true,
		why_not: null,
		url: the_repository.what_it_said.html_url,
		description: the_repository.what_it_said.description ?? null,
		stars: the_repository.what_it_said.stargazers_count ?? null,
		the_licence_the_api_says: the_repository.what_it_said.license?.spdx_id ?? null,
		// **A count of check runs, and a count of zero is a fact.** The project this page is
		// about has one workflow, and a repository with none would report `0` here — which is
		// a different sentence from the `null` above and is drawn differently.
		how_many_check_runs: the_checks.was_read ? the_checks.what_it_said.total_count ?? 0 : null,
		why_the_check_runs_are_unread: the_checks.was_read ? null : the_checks.why_not,
	};
}
