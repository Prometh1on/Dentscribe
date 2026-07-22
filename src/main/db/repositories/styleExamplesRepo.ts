import { randomBytes } from 'node:crypto';
import type { DatabaseInstance } from '../types';
import type { CreateStyleExampleInput, StyleExample } from '../../../common/types/styleExample';
import type { ConversationCategory } from '../../../common/types/category';

interface StyleExampleRow {
  id: string;
  title: string;
  content: string;
  category: string | null;
  extracted_style: string | null;
}

const SELECT_COLUMNS = 'id, title, content, category, extracted_style';

function rowToExample(row: StyleExampleRow): StyleExample {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: (row.category as ConversationCategory | null) ?? undefined,
    extractedStyle: row.extracted_style ?? undefined,
  };
}

export function listStyleExamples(db: DatabaseInstance, userId: string): StyleExample[] {
  const rows = db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM style_examples WHERE user_id = ? ORDER BY created_at`)
    .all(userId) as StyleExampleRow[];
  return rows.map(rowToExample);
}

export function createStyleExample(
  db: DatabaseInstance,
  userId: string,
  input: CreateStyleExampleInput
): StyleExample {
  const id = randomBytes(16).toString('hex');
  db.prepare(
    'INSERT INTO style_examples (id, user_id, title, content, category) VALUES (@id, @userId, @title, @content, @category)'
  ).run({ id, userId, title: input.title, content: input.content, category: input.category ?? null });

  const row = db.prepare(`SELECT ${SELECT_COLUMNS} FROM style_examples WHERE id = ?`).get(id) as StyleExampleRow;
  return rowToExample(row);
}

export function deleteStyleExample(db: DatabaseInstance, userId: string, id: string): void {
  db.prepare('DELETE FROM style_examples WHERE id = ? AND user_id = ?').run(id, userId);
}

/** Sets the LLM-derived style summary for an example once styleAnalyzer.ts has computed it. */
export function setStyleExampleExtractedStyle(db: DatabaseInstance, id: string, extractedStyle: string): void {
  db.prepare("UPDATE style_examples SET extracted_style = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(
    extractedStyle,
    id
  );
}
