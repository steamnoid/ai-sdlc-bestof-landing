/** A shell first: it asks nothing. */
export async function read_what_github_says(the_api, owner, name) {
	return { was_read: false, why_not: 'no API asked yet', url: `https://github.com/${owner}/${name}`, description: null, stars: null, the_licence_the_api_says: null, how_many_check_runs: null };
}
