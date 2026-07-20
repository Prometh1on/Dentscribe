import { randomBytes } from 'node:crypto';
import type { DatabaseInstance } from '../types';
import type { CreateStyleExampleInput, StyleExample } from '../../../common/types/styleExample';

interface StyleExampleRow {
  id: string;
  title: string;
  content: string;
}

function rowToExample(row: StyleExampleRow): StyleExample {
  return { id: row.id, title: row.title, content: row.content };
}

export function listStyleExamples(db: DatabaseInstance, userId: string): StyleExample[] {
  const rows = db
    .prepare('SELECT id, title, content FROM style_examples WHERE user_id = ? ORDER BY created_at')
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
    'INSERT INTO style_examples (id, user_id, title, content) VALUES (@id, @userId, @title, @content)'
  ).run({ id, userId, title: input.title, content: input.content });

  const row = db.prepare('SELECT id, title, content FROM style_examples WHERE id = ?').get(id) as StyleExampleRow;
  return rowToExample(row);
}

export function deleteStyleExample(db: DatabaseInstance, userId: string, id: string): void {
  db.prepare('DELETE FROM style_examples WHERE id = ? AND user_id = ?').run(id, userId);
}
