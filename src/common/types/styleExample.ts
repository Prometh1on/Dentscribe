import type { ConversationCategory } from './category';

export interface StyleExample {
  id: string;
  title: string;
  content: string;
  /** Optional — lets the formatter prefer examples tagged for the same appointment category. */
  category?: ConversationCategory;
  /**
   * A short, read-only, plain-language summary of this example's structure/phrases/
   * abbreviations/terminology, produced by one extra local LLM call when the example is
   * saved. Shown to the dentist as "what the system noticed" — informational only, never
   * used to gate whether the example is usable for formatting.
   */
  extractedStyle?: string;
}

export interface CreateStyleExampleInput {
  title: string;
  content: string;
  category?: ConversationCategory;
}
