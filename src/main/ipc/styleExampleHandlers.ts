import { ipcMain } from 'electron';
import type { DatabaseInstance } from '../db/types';
import type { CreateStyleExampleInput } from '../../common/types/styleExample';
import { CHANNELS } from './channels';
import { withAuth } from './withAuth';
import { createStyleExample, deleteStyleExample, listStyleExamples } from '../db/repositories/styleExamplesRepo';

export function registerStyleExampleHandlers(db: DatabaseInstance): void {
  ipcMain.handle(
    CHANNELS.styleExamplesList,
    withAuth(db, (ctx) => listStyleExamples(db, ctx.userId))
  );

  ipcMain.handle(
    CHANNELS.styleExamplesCreate,
    withAuth(db, (ctx, input: CreateStyleExampleInput) => createStyleExample(db, ctx.userId, input))
  );

  ipcMain.handle(
    CHANNELS.styleExamplesDelete,
    withAuth(db, (ctx, id: string) => deleteStyleExample(db, ctx.userId, id))
  );
}
