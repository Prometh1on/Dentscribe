import { randomBytes } from 'node:crypto';
import type { DatabaseInstance } from '../types';
import type { CreateStaffNameInput, StaffName } from '../../../common/types/staffName';

interface StaffNameRow {
  id: string;
  name: string;
}

function rowToStaffName(row: StaffNameRow): StaffName {
  return { id: row.id, name: row.name };
}

export function listStaffNames(db: DatabaseInstance, userId: string): StaffName[] {
  const rows = db
    .prepare('SELECT id, name FROM staff_names WHERE user_id = ? ORDER BY created_at')
    .all(userId) as StaffNameRow[];
  return rows.map(rowToStaffName);
}

export function createStaffName(db: DatabaseInstance, userId: string, input: CreateStaffNameInput): StaffName {
  const id = randomBytes(16).toString('hex');
  db.prepare('INSERT INTO staff_names (id, user_id, name) VALUES (@id, @userId, @name)').run({
    id,
    userId,
    name: input.name,
  });

  const row = db.prepare('SELECT id, name FROM staff_names WHERE id = ?').get(id) as StaffNameRow;
  return rowToStaffName(row);
}

export function deleteStaffName(db: DatabaseInstance, userId: string, id: string): void {
  db.prepare('DELETE FROM staff_names WHERE id = ? AND user_id = ?').run(id, userId);
}
