import { FastifyPluginAsync } from 'fastify';
import { query } from '../db';
import { STATE_FACTS } from '../data/stateFacts';

/**
 * Talk / chat endpoint.
 *
 * AWS Hugging Face SageMaker / Hugging Face Inference:
 * Point HF_ENDPOINT (or SAGEMAKER_ENDPOINT_URL) + HF_MODEL at any AWS Hugging Face
 * SageMaker real-time endpoint or Hugging Face Deep Learning Container (TGI).
 * When no remote endpoint is configured or network is lost, the endpoint gracefully
 * falls back to answering from seeded state facts — so the classroom experience
 * never hard-fails or stalls.
 *
 * Guardrails:
 *   1. System prompt scoped to Indian geography/history for the active state.
 *   2. Per-section rate limit.
 *   3. Full transcript persisted to Postgres for teacher review.
 *   4. Student names are NEVER included in the outbound payload (100% PII privacy).
 */

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = process.env.HF_MODEL ?? 'meta-llama/Llama-3.2-3B-Instruct';
const HF_ENDPOINT =
  process.env.SAGEMAKER_ENDPOINT_URL ??
  process.env.HF_ENDPOINT ??
  'https://router.huggingface.co/v1/chat/completions';

// ─── Guardrail 2: simple in-memory rate limit, per section ───────────────────
const RATE_LIMIT_MAX = parseInt(process.env.CHAT_RATE_LIMIT ?? '20', 10);
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(sectionId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(sectionId);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(sectionId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count++;
  return true;
}

// Periodically drop expired buckets so the map cannot grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of rateBuckets) if (now > b.resetAt) rateBuckets.delete(key);
}, RATE_LIMIT_WINDOW_MS).unref();

// ─── Guardrail 1: topic-scoped system prompt ────────────────────────────────
// Exported for unit testing.
export function buildSystemPrompt(stateName: string | undefined): string {
  const facts = stateName ? STATE_FACTS[stateName] : undefined;
  const factLines = facts?.map((f) => `- ${f.fact}`).join('\n') ?? '';

  return [
    'You are a friendly lion mascot guide in "Bharat Quest", an educational game',
    'for Indian schoolchildren (ages 8-14).',
    '',
    'RULES:',
    '- Only discuss Indian geography, history, culture, wildlife and civics.',
    '- If asked about anything else, gently steer back to exploring India.',
    '- Keep answers to 2-3 short sentences in simple, encouraging language.',
    '- Never ask for or repeat personal information about the child.',
    '- If unsure of a fact, say so rather than guessing.',
    stateName ? `\nThe class is currently exploring: ${stateName}.` : '',
    factLines ? `\nVerified facts you may use:\n${factLines}` : '',
  ].join('\n');
}

/** Offline / no-key fallback: answer from seeded facts by keyword overlap. */
// Exported for unit testing.
export function factFallback(message: string, stateName?: string): string {
  const facts = stateName ? STATE_FACTS[stateName] : undefined;
  if (!facts?.length) {
    return "I'm still learning about this place! Try the Facts tab to discover more.";
  }

  const words = message
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  let best = facts[0];
  let bestScore = 0;
  for (const f of facts) {
    const lower = f.fact.toLowerCase();
    const score = words.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }

  return bestScore > 0
    ? `Great question! ${best.fact}`
    : `Here's something interesting about ${stateName}: ${best.fact}`;
}

interface ChatBody {
  sectionId: string;
  stateName?: string;
  message: string;
}

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /chat/:sectionId — transcript for the teacher / to restore the thread
  fastify.get<{ Params: { sectionId: string }; Querystring: { limit?: string } }>(
    '/:sectionId',
    async (request, reply) => {
      const { sectionId } = request.params;
      const limit = Math.min(parseInt(request.query.limit ?? '100', 10) || 100, 500);

      const result = await query(
        `SELECT id, role, content, state_name, created_at
           FROM chat_messages
          WHERE section_id = $1
          ORDER BY created_at DESC
          LIMIT $2`,
        [sectionId, limit]
      );

      // Return oldest-first for natural rendering.
      return reply.send(result.rows.reverse());
    }
  );

  // POST /chat — send a message, persist both sides, return the reply
  fastify.post<{ Body: ChatBody }>('/', async (request, reply) => {
    const { sectionId, stateName, message } = request.body ?? ({} as ChatBody);

    if (!sectionId || !message?.trim()) {
      return reply.status(400).send({ error: 'sectionId and message are required' });
    }
    if (message.length > 500) {
      return reply.status(400).send({ error: 'Message too long (max 500 characters)' });
    }
    if (!checkRateLimit(sectionId)) {
      return reply
        .status(429)
        .send({ error: 'Too many messages right now — please wait a moment.' });
    }

    // Guardrail 3: persist the student's message.
    await query(
      `INSERT INTO chat_messages (section_id, state_name, role, content)
       VALUES ($1, $2, 'user', $3)`,
      [sectionId, stateName ?? null, message]
    );

    let answer: string;
    let source: 'model' | 'facts' = 'facts';

    if (HF_API_KEY) {
      try {
        // Guardrail 4: only the message text and state context are sent —
        // no student names or identifiers.
        const res = await fetch(HF_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: HF_MODEL,
            max_tokens: 200,
            temperature: 0.6,
            messages: [
              { role: 'system', content: buildSystemPrompt(stateName) },
              { role: 'user', content: message },
            ],
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            answer = text;
            source = 'model';
          } else {
            answer = factFallback(message, stateName);
          }
        } else {
          fastify.log.warn({ status: res.status }, 'Chat model call failed; using fact fallback');
          answer = factFallback(message, stateName);
        }
      } catch (err) {
        fastify.log.warn({ err }, 'Chat model unreachable; using fact fallback');
        answer = factFallback(message, stateName);
      }
    } else {
      answer = factFallback(message, stateName);
    }

    await query(
      `INSERT INTO chat_messages (section_id, state_name, role, content)
       VALUES ($1, $2, 'assistant', $3)`,
      [sectionId, stateName ?? null, answer]
    );

    return reply.send({ reply: answer, source });
  });
};
