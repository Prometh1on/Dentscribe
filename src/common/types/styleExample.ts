import type { ConversationCategory } from './category';

export interface StyleExample {
  id: string;
  title: string;
  content: string;
  /** Optional — lets the formatter prefer examples tagged for the same appointment category. */
  category?: ConversationCategory;
}

export interface CreateStyleExampleInput {
  title: string;
  content: string;
  category?: ConversationCategory;
}
