/** A shell first: it reads no history. */
export const HOW_MANY_COMMITS_THE_PAGE_SHOWS = 8;
export function is_a_git_repository(inside) { return { is_one: false, why_not: 'not read yet' }; }
export function how_the_history_holds_up(the_commits) { return { red: 0, green: 0, answered: 0 }; }
export function read_the_history(inside) {
	return { is_a_git_repository: false, why_not: 'not read yet', branch: null, tip_commit: null, commits: [], recent: [], red: 0, green: 0, answered: 0 };
}
