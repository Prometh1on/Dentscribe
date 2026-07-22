import type { LlmMessage } from '../../../common/types/llm';
import { createLlmProvider } from '../llm/registry';
import { getAiConfig } from '../../config/aiConfig';

const EXTRACTION_SYSTEM_PROMPT = `You analyze one dental clinical note to describe its writing style, for a dentist to review at a glance — not to process or reformat it.

Produce a short summary (4-6 bullet points, one line each, no headers) covering, where evident from this single note:
- Overall structure and ordering (e.g. "presenting complaint, then findings, then plan")
- Common phrases or sentence patterns
- Abbreviations used (list a few, if any)
- Level of detail (concise vs. thorough)
- Notable terminology choices (e.g. "restoration" rather than "filling")

Output only the bullet points, each starting with "- ". No preamble, no explanation.`;

/**
 * Runs once when a style example is saved, so the dentist gets a quick read on "what
 * the system noticed" without re-reading their own note. Non-fatal on failure: the
 * example is still saved and usable for formatting either way (e.g. if the local LLM
 * isn't installed/running yet, or a cloud provider hasn't been configured) — this is
 * a nice-to-have insight, not a requirement for the core feature to work.
 */
export async function extractStyleSummary(exampleContent: string): Promise<string | null> {
  try {
    const llm = createLlmProvider(getAiConfig());
    const messages: LlmMessage[] = [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: exampleContent },
    ];
    const result = await llm.complete(messages, { maxTokens: 300, temperature: 0.1 });
    const trimmed = result.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
