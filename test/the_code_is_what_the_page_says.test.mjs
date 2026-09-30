/**
 * The domain is Python objects, so it is imported and not transcribed.
 *
 * The project this page is about has six stages, five roles and seven legal moves, and
 * three ways of saying which stages an agent must be holding — all three in this family,
 * all three still in use. So the reader reports which convention it used, because a table
 * with a column nobody can account for is a table nobody can check.
 *
 * | the reader is asked | it must answer |
 * |---|---|
 * | what stages are there | the names, in the enumeration's own order, never derived from a document |
 * | which stages an agent must be holding | one row per stage, every stage in exactly one answer |
 * | which convention said so | its own name, so the column is accounted for |
 * | a stage in both sets, or in neither | `TheInvariantSaysNothingAboutAStageError`, naming it |
 * | which roles are there | the names, in the enumeration's own order |
 * | the table of moves | one row per stage, destinations sorted, a terminal stage as `[]` |
 * | a table that is not one row per stage | `TheTableOfLegalMovesIsNotReadableError` |
 * | where an approved artifact leads | a map, or `null` and a sentence saying where it looked |
 * | a project with no gate map | **not** a refusal — a project that has not wired one yet |
 *
 * The fixture uses the convention this project does *not* use, on purpose: two tuples in
 * the state machine. A reader written to the project's own convention would pass a test
 * about the project and fail this one, and the second test is the one that says anything.
 *
 * Every `it` names a stage of the fixture — ARRIVED, DEPARTED, PORTER, CLERK — so a test
 * that answered from the wrong tree is caught rather than believed.
 */

import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const the_reader = resolve('scripts/ask_the_code.py');

const the_project = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'fixtures',
	'a_project_that_declares_its_layers',
);

const ask_about = (at) =>
	JSON.parse(execFileSync('python3', [the_reader, '--repository', at], { encoding: 'utf8' }));

const ask_and_take_the_refusal = (at) => {
	try {
		execFileSync('python3', [the_reader, '--repository', at], { encoding: 'utf8', stdio: 'pipe' });
		return null;
	} catch (the_failure) {
		return the_failure;
	}
};

/** A project whose stage says who holds it with a method, which is the other convention. */
const a_project_whose_stages_answer_for_themselves = () => {
	const the_root = mkdtempSync(join(tmpdir(), 'a-project-answering-for-itself-'));
	const the_package = join(the_root, 'src', 'aisdlc', 'domain');
	mkdirSync(the_package, { recursive: true });
	writeFileSync(join(the_root, 'src', 'aisdlc', '__init__.py'), '"""No layers here."""\n');
	writeFileSync(
		join(the_package, '__init__.py'),
		'"""The rules."""\n',
	);
	writeFileSync(
		join(the_package, 'stage.py'),
		[
			'"""Stages that say who is holding them."""',
			'',
			'from __future__ import annotations',
			'',
			'from enum import Enum',
			'',
			'',
			'class Stage(Enum):',
			'    """Two stages, and each one says for itself."""',
			'',
			'    WAITING = "WAITING"',
			'    CARRIED = "CARRIED"',
			'',
			'    def an_agent_must_be_holding_it(self) -> bool:',
			'        """Whether a work item here has to name its holder."""',
			'        return self is Stage.CARRIED',
			'',
		].join('\n'),
	);
	writeFileSync(
		join(the_package, 'role.py'),
		['"""Roles."""', '', 'from enum import Enum', '', '', 'class Role(Enum):', '    """One."""', '', '    ONE = "ONE"', ''].join('\n'),
	);
	writeFileSync(
		join(the_package, 'state_machine.py'),
		[
			'"""The table, and nothing about who holds anything."""',
			'',
			'from aisdlc.domain.stage import Stage',
			'',
			'LEGAL_TRANSITIONS: dict[Stage, frozenset[Stage]] = {',
			'    Stage.WAITING: frozenset({Stage.CARRIED}),',
			'    Stage.CARRIED: frozenset(),',
			'}',
			'',
		].join('\n'),
	);
	return the_root;
};

describe('the stages, read out of the enumeration', () => {
	it('names both, in the order the enumeration declares them', () => {
		deepStrictEqual(
			ask_about(the_project).the_names_the_stages_are_written_as,
			['ARRIVED', 'DEPARTED'],
			'the reader read the tree it was given, or a tree it remembers',
		);
	});

	it('answers with no name from the project this page is about', () => {
		const the_answer = ask_about(the_project);
		for (const a_stage of the_answer.stages) {
			ok(
				!['IDLE', 'READY', 'AWAITING_HUMAN_APPROVAL', 'DONE', 'IN_PROGRESS_BY_AGENT'].includes(a_stage.name),
				`the stage ${a_stage.name} belongs to the project this page is about, so the reader is not reading the tree it was given`,
			);
		}
	});
});

describe('which stages an agent must be holding, and which convention said so', () => {
	it('answers from two tuples in the state machine, and names that convention', () => {
		const the_answer = ask_about(the_project);
		strictEqual(
			the_answer.how_the_project_says_who_must_hold_a_stage,
			'two tuples in the state machine',
			'the column is not accounted for, so a reader cannot check it',
		);
		deepStrictEqual(
			the_answer.stages,
			[
				{ name: 'ARRIVED', an_agent_must_be_holding_it: false },
				{ name: 'DEPARTED', an_agent_must_be_holding_it: true },
			],
			'the invariant is not total, or the tuples were not read',
		);
	});

	it('reads a method on the stage, and names that convention instead', () => {
		// **The project this page is about uses this one.** A reader written to the fixture's
		// convention alone would report this project as saying nothing about who holds its
		// work — which is a third thing, and a page printing it prints an absence as a fact.
		const the_answer = ask_about(a_project_whose_stages_answer_for_themselves());
		strictEqual(
			the_answer.how_the_project_says_who_must_hold_a_stage,
			'a method on the stage',
			'the convention this project actually uses was not the one reported',
		);
		deepStrictEqual(
			the_answer.stages,
			[
				{ name: 'WAITING', an_agent_must_be_holding_it: false },
				{ name: 'CARRIED', an_agent_must_be_holding_it: true },
			],
			'the method on the stage was not called, or was called the wrong way round',
		);
	});
});

describe('the table of moves', () => {
	it('gives a terminal stage an empty list, and not a missing key', () => {
		const the_moves = ask_about(the_project).moves;
		deepStrictEqual(the_moves[0], { from: 'ARRIVED', to: ['DEPARTED'] }, 'the first row is not the first edge');
		deepStrictEqual(
			the_moves[1],
			{ from: 'DEPARTED', to: [] },
			'a terminal stage has nowhere to go, and a missing key reads as a reader that did not look',
		);
	});

	it('has one row per stage, because a table that is not exhaustive is not a table', () => {
		const the_answer = ask_about(the_project);
		deepStrictEqual(
			the_answer.moves.map((a_row) => a_row.from),
			the_answer.the_names_the_stages_are_written_as,
			'the table has a different number of rows than there are stages',
		);
	});
});

describe('the roles', () => {
	it('names all three, in the order the enumeration declares them', () => {
		deepStrictEqual(
			ask_about(the_project).roles,
			['PORTER', 'CLERK', 'WARDEN'],
			'the reader read the tree it was given, or a tree it remembers',
		);
	});
});

describe('a gate map that is not there is a value, and not a refusal', () => {
	it('answers null and a sentence, and the sentence says where it looked', () => {
		const the_answer = ask_about(the_project);
		strictEqual(the_answer.gates, null, 'a gate map appeared for a project that has not written one');
		ok(
			the_answer.why_the_gates_could_not_be_read !== null,
			'there is no gate map and no reason, so the page would print an absence with nothing beside it',
		);
		match(
			the_answer.why_the_gates_could_not_be_read,
			/router/,
			'the reason does not say where the reader looked, so a reader cannot go and look there',
		);
	});
});

describe('a project that says nothing about who holds its work is refused', () => {
	it('refuses by name, names the stage, and prints nothing on stdout', () => {
		// **The whole table is rewritten, not just the stage.** Rewriting `stage.py` alone
		// leaves the move table naming a stage the enumeration no longer has, which is a
		// different refusal and a real one — a tree part-way through an edit — and a test
		// that meant to ask about the invariant would be passing for the wrong reason.
		const the_root = a_project_whose_stages_answer_for_themselves();
		writeFileSync(
			join(the_root, 'src', 'aisdlc', 'domain', 'stage.py'),
			[
				'"""Stages that say nothing about who holds them."""',
				'',
				'from enum import Enum',
				'',
				'',
				'class Stage(Enum):',
				'    """One stage, unmentioned."""',
				'',
				'    WAITING = "WAITING"',
				'',
			].join('\n'),
		);
		writeFileSync(
			join(the_root, 'src', 'aisdlc', 'domain', 'state_machine.py'),
			[
				'"""The table, and still nothing about who holds anything."""',
				'',
				'from aisdlc.domain.stage import Stage',
				'',
				'LEGAL_TRANSITIONS: dict[Stage, frozenset[Stage]] = {',
				'    Stage.WAITING: frozenset(),',
				'}',
				'',
			].join('\n'),
		);
		const the_failure = ask_and_take_the_refusal(the_root);
		ok(the_failure, 'a project that says nothing about its invariant was answered about rather than refused');
		strictEqual(the_failure.status, 1, 'the refusal exited zero, so a collector would read it as an answer');
		strictEqual(the_failure.stdout, '', 'stdout carried something, so a caller gets a page state with no refusal in it');
		match(
			String(the_failure.stderr),
			/TheInvariantSaysNothingAboutAStageError/,
			'the refusal is not named after the rule it protects',
		);
		match(String(the_failure.stderr), /WAITING/, 'the refusal does not name the stage the project left unmentioned');
	});

	it('refuses a table naming a stage that is not there, and does not print a traceback', () => {
		// **A stage deleted from the enumeration leaves the table behind referring to it.**
		// The helper's tree is already in exactly that state after `stage.py` is replaced,
		// and the first version of this reader let the `AttributeError` out — so the page
		// would have shown a Python traceback, which is a true sentence about this
		// repository and one no reader can act on.
		const the_root = a_project_whose_stages_answer_for_themselves();
		writeFileSync(
			join(the_root, 'src', 'aisdlc', 'domain', 'stage.py'),
			[
				'"""Stages, with one of the pair deleted."""',
				'',
				'from enum import Enum',
				'',
				'',
				'class Stage(Enum):',
				'    """One stage, and the table still knows two."""',
				'',
				'    WAITING = "WAITING"',
				'',
			].join('\n'),
		);
		const the_failure = ask_and_take_the_refusal(the_root);
		ok(the_failure, 'a table naming a stage that is not there was answered about rather than refused');
		match(
			String(the_failure.stderr),
			/TheTableNamesAStageThatIsNotThereError/,
			'the refusal is not named after the rule it protects',
		);
		ok(
			!String(the_failure.stderr).includes('Traceback'),
			'stderr carries a Python traceback, so the page would show a stack trace instead of a sentence about the project',
		);
	});
});
