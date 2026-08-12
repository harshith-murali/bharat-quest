import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, factFallback } from './chat';
import { STATE_FACTS } from '../data/stateFacts';

/**
 * The chat guardrails are the part of this feature with real safety weight:
 * the prompt must keep the model on-topic, and the fallback must still answer
 * usefully when no model key is configured.
 */

describe('buildSystemPrompt', () => {
  it('constrains the model to Indian educational topics', () => {
    const prompt = buildSystemPrompt('Ladakh');
    expect(prompt).toMatch(/Only discuss Indian geography, history, culture/i);
    expect(prompt).toMatch(/steer back to exploring India/i);
  });

  it('names the state the class is exploring', () => {
    expect(buildSystemPrompt('Kerala')).toContain('currently exploring: Kerala');
  });

  it('injects that state’s verified facts as grounding', () => {
    const prompt = buildSystemPrompt('Ladakh');
    const firstFact = STATE_FACTS.Ladakh[0].fact;
    expect(prompt).toContain(firstFact);
  });

  it('forbids collecting personal information about the child', () => {
    expect(buildSystemPrompt('Goa')).toMatch(/Never ask for or repeat personal information/i);
  });

  it('still produces a valid prompt when no state is given', () => {
    const prompt = buildSystemPrompt(undefined);
    expect(prompt).toMatch(/Bharat Quest/);
    expect(prompt).not.toMatch(/currently exploring:/);
  });

  it('does not leak facts from a different state', () => {
    const prompt = buildSystemPrompt('Goa');
    expect(prompt).not.toContain(STATE_FACTS.Ladakh[0].fact);
  });
});

describe('factFallback', () => {
  it('picks the fact that best matches the question', () => {
    const answer = factFallback('Tell me about the snow leopard', 'Ladakh');
    expect(answer).toMatch(/snow leopard/i);
  });

  it('still answers when nothing matches, rather than failing', () => {
    const answer = factFallback('zzzz qqqq', 'Ladakh');
    expect(answer).toContain('Ladakh');
    expect(answer.length).toBeGreaterThan(20);
  });

  it('degrades gracefully for an unknown state', () => {
    const answer = factFallback('anything', 'Atlantis');
    expect(answer).toMatch(/still learning/i);
  });

  it('degrades gracefully when no state is supplied', () => {
    expect(factFallback('anything')).toMatch(/still learning/i);
  });

  it('only ever returns a seeded fact, never invented text', () => {
    const answer = factFallback('What lake is in Ladakh?', 'Ladakh');
    const known = STATE_FACTS.Ladakh.map((f) => f.fact);
    expect(known.some((f) => answer.includes(f))).toBe(true);
  });
});

describe('seeded fact data', () => {
  it('covers every state with between 5 and 10 facts', () => {
    const offenders = Object.entries(STATE_FACTS)
      .filter(([, facts]) => facts.length < 5 || facts.length > 10)
      .map(([state, facts]) => `${state}: ${facts.length}`);

    expect(offenders).toEqual([]);
  });

  it('has no duplicate facts within a state', () => {
    const offenders = Object.entries(STATE_FACTS)
      .filter(([, facts]) => new Set(facts.map((f) => f.fact)).size !== facts.length)
      .map(([state]) => state);

    expect(offenders).toEqual([]);
  });

  it('gives every fact a category', () => {
    const offenders = Object.entries(STATE_FACTS).flatMap(([state, facts]) =>
      facts.filter((f) => !f.category?.trim()).map(() => state)
    );
    expect(offenders).toEqual([]);
  });
});
