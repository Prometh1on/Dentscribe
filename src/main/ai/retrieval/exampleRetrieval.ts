import type { StyleExample } from '../../../common/types/styleExample';
import type { ConversationCategory } from '../../../common/types/category';

/**
 * No embeddings, by design — a dentist has at most a few dozen style examples, and a
 * dedicated embedding model/vector store is unjustified overhead at that scale. Plain
 * shared-keyword overlap between the transcript and each candidate example is enough
 * to rank "which of my saved examples looks most like this encounter" without any new
 * model download or external dependency.
 */
const STOPWORDS = new Set([
  'the', 'and', 'was', 'were', 'that', 'this', 'with', 'have', 'has', 'had',
  'for', 'are', 'you', 'your', 'not', 'but', 'they', 'them', 'then', 'than',
  'will', 'would', 'could', 'should', 'been', 'being', 'from', 'into', 'onto',
  'about', 'again', 'today', 'okay', 'doctor', 'patient', 'yeah', 'well', 'just',
]);

/** Caps how many examples ever go into a single prompt, so context size stays bounded as a dentist's library grows well past a handful of examples. */
const MAX_EXAMPLES_IN_PROMPT = 5;

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
  return new Set(words);
}

function sharedTokenCount(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared += 1;
  }
  return shared;
}

/**
 * Category filter first (cheap, deterministic), then — only if there are more matching
 * examples than fit comfortably in a prompt — rank the rest by keyword overlap with the
 * transcript and keep the top matches. Falls back to every saved example when none match
 * the selected category, same as before: better to show some style guidance than none.
 */
export function selectRelevantExamples(
  examples: StyleExample[],
  category: ConversationCategory | undefined,
  transcriptText: string
): StyleExample[] {
  const categoryMatched = category ? examples.filter((example) => example.category === category) : examples;
  const candidates = categoryMatched.length > 0 ? categoryMatched : examples;

  if (candidates.length <= MAX_EXAMPLES_IN_PROMPT) return candidates;

  const transcriptTokens = tokenize(transcriptText);
  const ranked = candidates
    .map((example) => ({ example, score: sharedTokenCount(transcriptTokens, tokenize(example.content)) }))
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, MAX_EXAMPLES_IN_PROMPT).map((entry) => entry.example);
}
