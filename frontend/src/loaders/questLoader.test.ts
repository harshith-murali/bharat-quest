import { describe, it, expect } from 'vitest';
import {
  CANONICAL_QUEST_STATES,
  QUEST_PASSING_SCORE,
  QUEST_QUESTIONS_PER_ATTEMPT,
  hasQuestData,
  resolveCorrectIndex,
  getQuestTopics,
  filterByTopic,
} from './questLoader';
import { STATE_LANDMARKS } from '../content/state_landmarks';
import type { QuestQuestion } from '../types';

function q(partial: Partial<QuestQuestion>): QuestQuestion {
  return {
    id: 'x',
    state: 'Ladakh',
    topic: 'Geography',
    question: 'Q?',
    options: ['a', 'b', 'c', 'd'],
    answer: 'a',
    difficulty: 'easy',
    source: 'test',
    ...partial,
  } as QuestQuestion;
}

describe('quest progression constants', () => {
  it('has exactly 30 canonical states, starting at Ladakh', () => {
    expect(CANONICAL_QUEST_STATES).toHaveLength(30);
    expect(CANONICAL_QUEST_STATES[0]).toBe('Ladakh');
  });

  it('contains no duplicate states', () => {
    expect(new Set(CANONICAL_QUEST_STATES).size).toBe(CANONICAL_QUEST_STATES.length);
  });

  // The pass mark was wrongly 8/10 in several places at one point; lock it down.
  it('requires 6 of 10 to pass', () => {
    expect(QUEST_PASSING_SCORE).toBe(6);
    expect(QUEST_QUESTIONS_PER_ATTEMPT).toBe(10);
    expect(QUEST_PASSING_SCORE).toBeLessThan(QUEST_QUESTIONS_PER_ATTEMPT);
  });

  it('every canonical state has question data', () => {
    const missing = CANONICAL_QUEST_STATES.filter((s) => !hasQuestData(s));
    expect(missing).toEqual([]);
  });

  // The arrival modal looks landmarks up by exact state name, so a typo in
  // either list silently degrades to the generic fallback.
  it('every canonical state has a landmark entry', () => {
    const missing = CANONICAL_QUEST_STATES.filter((s) => !STATE_LANDMARKS[s]);
    expect(missing).toEqual([]);
  });

  it('has no landmark entries for unknown states', () => {
    const extra = Object.keys(STATE_LANDMARKS).filter(
      (k) => !CANONICAL_QUEST_STATES.includes(k)
    );
    expect(extra).toEqual([]);
  });
});

describe('resolveCorrectIndex', () => {
  it('finds the index of the matching option', () => {
    expect(resolveCorrectIndex(['Ganges', 'Yamuna', 'Indus', 'Tapti'], 'Indus')).toBe(2);
  });

  it('returns -1 when the answer is not among the options', () => {
    // A -1 here means the question is unusable; the loader must not silently
    // fall back to index 0, which would mark a wrong option as correct.
    expect(resolveCorrectIndex(['a', 'b'], 'zzz')).toBe(-1);
  });

  // Matching is intentionally strict (exact string equality). Documented here
  // so it is a deliberate choice rather than an accident: a near-miss must
  // surface as an unusable question, not be silently coerced to a match.
  it('does not match on case or whitespace differences', () => {
    expect(resolveCorrectIndex(['Ganges', 'Yamuna'], '  ganges ')).toBe(-1);
  });
});

describe('topic helpers', () => {
  const questions = [
    q({ id: '1', topic: 'Geography' }),
    q({ id: '2', topic: 'History' }),
    q({ id: '3', topic: 'Geography' }),
    q({ id: '4', topic: undefined }),
  ];

  it('lists unique topics and drops undefined', () => {
    const topics = getQuestTopics(questions);
    expect(topics.sort()).toEqual(['Geography', 'History']);
  });

  it('filters questions by topic', () => {
    expect(filterByTopic(questions, 'Geography').map((x) => x.id)).toEqual(['1', '3']);
  });

  it('returns an empty list for an unknown topic', () => {
    expect(filterByTopic(questions, 'Astrophysics')).toEqual([]);
  });
});
