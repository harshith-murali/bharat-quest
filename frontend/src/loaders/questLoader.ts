import { QuestQuestion } from '../types';

// ─── Quest Loader ─────────────────────────────────────────────────────────────
// Fetches from /questions/quest/bharat_quest_<slug>.json served as static files.
// Never generates fallback questions — returns [] on any failure.
//
// Mapping is built from the actual filenames discovered in docs/questions/quest/.

// State name → filename slug mapping (derived from actual filenames)
const STATE_FILE_MAP: Record<string, string> = {
  'Andhra Pradesh':     'andhra_pradesh',
  'Arunachal Pradesh':  'arunachal_pradesh',
  'Assam':              'assam',
  'Bihar':              'bihar',
  'Chhattisgarh':       'chhattisgarh',
  'Goa':                'goa',
  'Gujarat':            'gujarat',
  'Haryana':            'haryana',
  'Himachal Pradesh':   'himachal_pradesh',
  'Jammu & Kashmir':    'jammu_kashmir',
  'Jharkhand':          'jharkhand',
  'Karnataka':          'karnataka',
  'Kerala':             'kerala',
  'Ladakh':             'ladakh',
  'Madhya Pradesh':     'madhya_pradesh',
  'Maharashtra':        'maharashtra',
  'Manipur':            'manipur',
  'Meghalaya':          'meghalaya',
  'Mizoram':            'mizoram',
  'Nagaland':           'nagaland',
  'Odisha':             'odisha',
  'Punjab':             'punjab',
  'Rajasthan':          'rajasthan',
  'Sikkim':             'sikkim',
  'Tamil Nadu':         'tamil_nadu',
  'Telangana':          'telangana',
  'Tripura':            'tripura',
  'Uttar Pradesh':      'uttar_pradesh',
  'Uttarakhand':        'uttarakhand',
  'West Bengal':        'west_bengal',
};

// Cache to avoid re-fetching
const _cache: Map<string, QuestQuestion[]> = new Map();

export const CANONICAL_QUEST_STATES: string[] = [
  'Ladakh',
  'Jammu & Kashmir',
  'Himachal Pradesh',
  'Punjab',
  'Uttarakhand',
  'Haryana',
  'Rajasthan',
  'Uttar Pradesh',
  'Arunachal Pradesh',
  'Sikkim',
  'Assam',
  'Nagaland',
  'Manipur',
  'Meghalaya',
  'Tripura',
  'Mizoram',
  'Bihar',
  'West Bengal',
  'Jharkhand',
  'Gujarat',
  'Madhya Pradesh',
  'Chhattisgarh',
  'Maharashtra',
  'Odisha',
  'Telangana',
  'Goa',
  'Andhra Pradesh',
  'Karnataka',
  'Tamil Nadu',
  'Kerala',
];

/**
 * Return all 30 state names in canonical Quest progression order (starting at Ladakh).
 */
export function getAvailableStates(): string[] {
  return CANONICAL_QUEST_STATES;
}

/**
 * Check if a state has a known question file.
 */
export function hasQuestData(stateName: string): boolean {
  return stateName in STATE_FILE_MAP;
}

/**
 * Load quest questions for a given state name.
 * Returns [] if the state has no file or if parsing fails.
 * Never fabricates questions.
 */
export async function loadQuestQuestions(stateName: string): Promise<QuestQuestion[]> {
  if (_cache.has(stateName)) return _cache.get(stateName)!;

  const slug = STATE_FILE_MAP[stateName];
  if (!slug) {
    console.warn(`[questLoader] No data file for state: "${stateName}"`);
    return [];
  }

  const filename = `bharat_quest_${slug}.json`;
  try {
    const res = await fetch(`/questions/quest/${filename}`);
    if (!res.ok) {
      console.warn(`[questLoader] ${filename} not found (${res.status})`);
      return [];
    }
    const data: QuestQuestion[] = await res.json();
    _cache.set(stateName, data);
    return data;
  } catch (err) {
    console.error(`[questLoader] Failed to load ${filename}:`, err);
    return [];
  }
}

export const QUEST_QUESTIONS_PER_ATTEMPT = 10;
export const QUEST_PASSING_SCORE = 6;

/**
 * Randomly select 10 unique questions from the state's question bank pool for one attempt.
 * Does not mutate original question data.
 */
export async function getRandomQuestAttemptQuestions(
  stateName: string,
  count: number = QUEST_QUESTIONS_PER_ATTEMPT
): Promise<QuestQuestion[]> {
  const all = await loadQuestQuestions(stateName);
  if (all.length < count) return [];
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/** Return unique, sorted topic names from a question array. */
export function getQuestTopics(questions: QuestQuestion[]): string[] {
  return [...new Set(questions.map((q) => q.topic).filter((t): t is string => t !== undefined))].sort();
}

/** Filter quest questions by topic. */
export function filterByTopic(questions: QuestQuestion[], topic: string): QuestQuestion[] {
  return questions.filter((q) => q.topic === topic);
}

/**
 * Load class-filtered textbook-derived questions (no state requirement).
 * Returns [] if the class has no questions or if file not found.
 */
export async function loadClassQuestions(classNum: number): Promise<QuestQuestion[]> {
  const filename = `class${classNum}.json`;
  try {
    const res = await fetch(`/questions/quest/${filename}`);
    if (!res.ok) {
      console.warn(`[questLoader] ${filename} not found (${res.status})`);
      return [];
    }
    const data: QuestQuestion[] = await res.json();
    return data;
  } catch (err) {
    console.error(`[questLoader] Failed to load ${filename}:`, err);
    return [];
  }
}

/**
 * Given options and an answer string, returns the index of the correct option.
 * Returns -1 if not found.
 */
export function resolveCorrectIndex(options: string[], answer: string): number {
  return options.findIndex((o) => o === answer);
}
