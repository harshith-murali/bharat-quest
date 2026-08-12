import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_QUEST_STATES } from './questLoader';

/**
 * Data-integrity checks over the shipped question banks.
 *
 * These are generated files, so a malformed entry is easy to introduce and
 * invisible at runtime — an answer that is not among its options simply makes
 * the question unusable rather than throwing. (This test caught exactly that:
 * four copies of an "Angkor Wat" question whose answer was
 * "Not in India textbooks".)
 */

const QUESTIONS_DIR = join(process.cwd(), 'public', 'questions', 'quest');

interface RawQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  difficulty?: string;
}

function loadBank(file: string): RawQuestion[] {
  return JSON.parse(readFileSync(join(QUESTIONS_DIR, file), 'utf-8'));
}

const bankFiles = readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith('.json'));

describe('question bank integrity', () => {
  it('ships question files', () => {
    expect(bankFiles.length).toBeGreaterThan(0);
  });

  it.each(bankFiles)('%s — every answer appears in its own options', (file) => {
    const offenders = loadBank(file)
      .filter((q) => !q.options?.includes(q.answer))
      .map((q) => `${q.id}: answer=${JSON.stringify(q.answer)}`);

    expect(offenders).toEqual([]);
  });

  it.each(bankFiles)('%s — every question has exactly 4 distinct options', (file) => {
    const offenders = loadBank(file)
      .filter((q) => q.options?.length !== 4 || new Set(q.options).size !== 4)
      .map((q) => `${q.id}: ${q.options?.length} options`);

    expect(offenders).toEqual([]);
  });

  it.each(bankFiles)('%s — no placeholder/garbage options', (file) => {
    const banned = [
      'unknown',
      'not mentioned',
      'not available',
      'all of the above',
      'none of the above',
      'cannot be determined',
      'not in india textbooks',
    ];
    const offenders = loadBank(file)
      .filter((q) => q.options?.some((o) => banned.includes(o.trim().toLowerCase())))
      .map((q) => q.id);

    expect(offenders).toEqual([]);
  });

  it.each(bankFiles)('%s — question ids are unique', (file) => {
    const ids = loadBank(file).map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The class-level banks were generated with a "standalone phrasing" rule, so
  // they are held to it strictly.
  //
  // The per-state banks predate that rule and cite tourism boards
  // ("…according to Kerala Tourism"). Those questions are answerable, so they
  // are not failed here — rewording them is a content task, not a code fix.
  const classBanks = bankFiles.filter((f) => f.startsWith('class'));

  it.each(classBanks)('%s — no "According to..." style phrasing', (file) => {
    const offenders = loadBank(file)
      .filter((q) => /according to|the textbook|the passage/i.test(q.question))
      .map((q) => q.id);

    expect(offenders).toEqual([]);
  });

  it('reports how many state-bank questions still use "according to" phrasing', () => {
    const stateBanks = bankFiles.filter((f) => f.startsWith('bharat_quest_'));
    const count = stateBanks.reduce<number>(
      (n: number, file: string) =>
        n + loadBank(file).filter((q) => /according to/i.test(q.question)).length,
      0
    );

    // Guard against regression: the number must not grow.
    expect(count).toBeLessThanOrEqual(138);
  });

  it('every canonical state has a question bank file', () => {
    const slugs = new Set(bankFiles);
    const missing = CANONICAL_QUEST_STATES.filter((state) => {
      const slug = `bharat_quest_${state.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`;
      return !slugs.has(slug);
    });
    expect(missing).toEqual([]);
  });
});
