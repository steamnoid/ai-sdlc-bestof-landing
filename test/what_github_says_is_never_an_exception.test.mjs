/**
 * A rate limit shortens the page. It does not break it.
 *
 * **Every endpoint here is public, so the token is used when it is there and never
 * demanded.** GitHub documents that using a token against its REST API invites secondary
 * rate limits, so a build that works without one is a build that works on a laptop and on a
 * busy runner alike.
 *
 * The reader is exercised against **a real HTTP server**, because the shapes that matter
 * here are shapes of failure: a 403, a 404, a port nothing is listening on, and no address
 * named at all. A mock of `fetch` proves the reader branches the way its author expected; a
 * real one proves it branches the way an API actually fails.
 *
 * | when the answer is | the page must |
 * |---|---|
 * | `0` check runs | print that the repository has no continuous integration — a fact |
 * | `null` check runs | say the call could not be made, and name why — not a fact |
 * | no API named at all | say which fields are missing and which flag would read them |
 * | anything at all | **not throw** — the page builds either way |
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, describe, it } from 'node:test';

import { read_what_github_says } from '../scripts/read_github.mjs';

let the_port = null;
let the_site = null;
let the_answer_to_give = { total_count: 4 };
let the_status = 200;

before(async () => {
	the_site = createServer((the_request, the_answer) => {
		if (the_request.url.includes('check-runs')) {
			the_answer.writeHead(the_status, { 'content-type': 'application/json' });
			the_answer.end(the_status === 200 ? JSON.stringify(the_answer_to_give) : '{"message":"no"}');
			return;
		}
		the_answer.writeHead(the_status, { 'content-type': 'application/json' });
		the_answer.end(
			the_status === 200
				? JSON.stringify({
						html_url: 'https://github.com/steamnoid/ai-sdlc-bestof',
						description: 'A project that shows its working.',
						stargazers_count: 12,
						default_branch: 'main',
						license: { spdx_id: 'NOASSERTION' },
					})
				: '{"message":"no"}',
		);
	});
	await new Promise((it_is_listening) => the_site.listen(0, '127.0.0.1', it_is_listening));
	the_port = the_site.address().port;
});

after(async () => {
	// **Closed, and not left for the process to exit on.** Node waits for an open handle, so
	// an unclosed server makes this file take ninety seconds — and a suite nobody waits for
	// is a suite that gets skipped. That was not a hypothetical cost here.
	await new Promise((it_is_closed) => the_site.close(it_is_closed));
});

const the_api = () => `http://127.0.0.1:${the_port}`;

describe('a repository with continuous integration, and one without', () => {
	it('reads the values the API gave, in its own words', async () => {
		the_status = 200;
		the_answer_to_give = { total_count: 4 };
		const the_reading = await read_what_github_says(the_api(), 'steamnoid', 'ai-sdlc-bestof');
		strictEqual(the_reading.was_read, true, 'a repository the API described was reported as unread');
		strictEqual(the_reading.stars, 12, 'the stars were not read');
		strictEqual(the_reading.how_many_check_runs, 4, 'the check runs were not counted');
	});

	it('reports a repository with no check runs as a count of zero, which is a fact', async () => {
		// **Zero and null are different sentences.** A repository with no continuous
		// integration is a thing a page can say; a repository whose check runs could not be
		// read is a thing it must not, and rendering both as "no workflow" would claim a
		// project has no CI on the strength of a call that failed.
		the_status = 200;
		the_answer_to_give = { total_count: 0 };
		const the_reading = await read_what_github_says(the_api(), 'steamnoid', 'ai-sdlc-bestof');
		strictEqual(the_reading.was_read, true, 'the repository was not read');
		strictEqual(the_reading.how_many_check_runs, 0, 'a repository with no check runs was reported as unread rather than as none');
		ok(the_reading.why_the_check_runs_are_unread === null, 'check runs that were read carry a reason why they were not');
	});
});

describe('a call that could not be made leaves a field unread, and not "no"', () => {
	it('reports a 403 as a refusal with the status, and counts no check runs', async () => {
		the_status = 403;
		const the_reading = await read_what_github_says(the_api(), 'steamnoid', 'ai-sdlc-bestof');
		strictEqual(the_reading.was_read, false, 'a 403 was read as an answer');
		match(the_reading.why_not, /403/, 'the refusal does not say what the API answered');
		strictEqual(the_reading.how_many_check_runs, null, 'a refused call reported a count, and that is a measurement nobody made');
	});

	it('reports an address nothing is listening on, and does not throw', async () => {
		// **The shape that matters most.** A reader that raised here would take the whole page
		// down for the one fact it could not read.
		const the_reading = await read_what_github_says('http://127.0.0.1:1', 'steamnoid', 'ai-sdlc-bestof');
		strictEqual(the_reading.was_read, false, 'an unreachable API was read as an answer');
		ok(the_reading.why_not.length > 0, 'an unreachable API was reported without a reason');
	});

	it('reports no API named at all, and names the flag that would have asked', async () => {
		// **The default run reaches no network, and the page says what is missing because of
		// it.** A build that cannot be run offline cannot be checked, so the offline path is
		// the tested one and the sentence is the deliverable.
		const the_reading = await read_what_github_says(null, 'steamnoid', 'ai-sdlc-bestof');
		strictEqual(the_reading.was_read, false, 'no API was named and something was read anyway');
		match(the_reading.why_not, /--github-api/, 'the sentence does not say which flag would read it');
		strictEqual(
			the_reading.how_many_check_runs,
			null,
			'nothing was asked and a count was reported, which claims a project has no CI on the strength of a call nobody made',
		);
	});
});
