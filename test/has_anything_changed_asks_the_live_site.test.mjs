/**
 * A comparison that did not happen is not agreement, and a skip that is wrong is invisible.
 *
 * Three ways this goes wrong, and each has a test:
 *
 * | the skip is wrong when | what the page does | what it costs |
 * |---|---|---|
 * | it never finds a difference | rebuilds and republishes every run | the same as having no skip |
 * | it finds one every run | never skips | a deploy a month for a byte-identical artifact |
 * | the published state cannot be read | **publishes** | a site that can never be built |
 *
 * **The site is asked over a real HTTP server, not a mocked `fetch`.** A mock of the network
 * proves the reader branches the way its author expected; a real `createServer` proves it
 * branches the way a 404 and an unreachable port actually do — and the difference between
 * those two is the whole third row of that table.
 *
 * Nothing here reaches the public internet, because the address is injected. A test that
 * needs a network is a test that was not run.
 */

import { match, ok, strictEqual } from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, describe, it } from 'node:test';

import { has_anything_changed } from '../scripts/has_anything_changed.mjs';

const the_state = { the_build: { read_at: '2026-09-30T12:00:00.000Z' }, the_suite: { passed: '189' } };

/** A site serving one state, or a status code, on a real port. */
let the_port = null;
let the_site = null;
let what_to_serve = the_state;
let the_status = 200;

before(async () => {
	the_site = createServer((the_request, the_answer) => {
		the_answer.writeHead(the_status, { 'content-type': 'application/json' });
		the_answer.end(the_status === 200 ? JSON.stringify(what_to_serve) : 'nothing here');
	});
	await new Promise((it_is_listening) => the_site.listen(0, '127.0.0.1', it_is_listening));
	the_port = the_site.address().port;
});

after(async () => {
	// **The server is closed, and not left for the process to exit on.** Node waits for an
	// open handle, so an unclosed one makes this file take ninety seconds instead of a
	// tenth of one — and a suite nobody waits for is a suite that gets skipped.
	await new Promise((it_is_closed) => the_site.close(it_is_closed));
});

const the_site_at = () => `http://127.0.0.1:${the_port}`;

describe('the same state, and a different one', () => {
	it('does not republish when the site is already serving this state', async () => {
		what_to_serve = the_state;
		the_status = 200;
		const the_answer = await has_anything_changed({ the_state, the_published_site: the_site_at() });
		strictEqual(the_answer.has_changed, false, 'a state the site is already serving was reported as a change');
		strictEqual(the_answer.why, 'every fact on the page is the fact already published', 'the reason does not say what was found');
	});

	it('republishes when the project moved, and names the first fact that moved', async () => {
		// **A count nobody reads is not the point; naming the field is.** A skip that says
		// "something changed" sends whoever reads the log to the diff, and the diff of a
		// 47 kB state is not somewhere to start.
		what_to_serve = { ...the_state, the_suite: { passed: '190' } };
		the_status = 200;
		const the_answer = await has_anything_changed({ the_state, the_published_site: the_site_at() });
		strictEqual(the_answer.has_changed, true, 'a project that gained a test did not republish');
		match(the_answer.why, /the_suite\.passed/, 'the reason does not name the field that differs');
		ok(the_answer.differences.includes('the_suite.passed'), 'the difference is not in the list the page logs');
	});
});

describe('a comparison that did not happen is not agreement', () => {
	it('publishes when the site answers 404, because nothing was compared', async () => {
		// **The row that matters.** A site that has never been published to answers 404, and
		// a reader that treated that as agreement would skip the first build of the page for
		// ever. Publishing again is cheap; being wrong is not.
		the_status = 404;
		const the_answer = await has_anything_changed({ the_state, the_published_site: the_site_at() });
		strictEqual(the_answer.has_changed, true, 'a 404 was treated as agreement, so the first build is skipped for ever');
		match(the_answer.why, /404/, 'the reason does not say what the site answered');
	});

	it('publishes when the site cannot be reached at all', async () => {
		const the_answer = await has_anything_changed({ the_state, the_published_site: 'http://127.0.0.1:1' });
		strictEqual(the_answer.has_changed, true, 'an unreachable site was treated as agreement');
		ok(the_answer.why.length > 0, 'an unreachable site was reported without a reason');
	});
});

describe('a state that was never read', () => {
	it('publishes rather than skipping, and says what to do', async () => {
		const the_answer = await has_anything_changed({ the_state: null, the_published_site: the_site_at() });
		strictEqual(the_answer.has_changed, true, 'a build with no state at all skipped itself');
		match(the_answer.why, /no state was named/, 'the reason does not say that no state was given');
	});
});
