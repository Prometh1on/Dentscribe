import { ipcMain } from 'electron';
import type { DatabaseInstance } from '../db/types';
import type { CreateStyleExampleInput, StyleExample } from '../../common/types/styleExample';
import { CHANNELS } from './channels';
import { withAuth } from './withAuth';
import {
  createStyleExample,
  deleteStyleExample,
  listStyleExamples,
  setStyleExampleExtractedStyle,
} from '../db/repositories/styleExamplesRepo';
import { extractStyleSummary } from '../ai/styleExtraction/styleAnalyzer';

export function registerStyleExampleHandlers(db: DatabaseInstance): void {
  ipcMain.handle(
    CHANNELS.styleExamplesList,
    withAuth(db, (ctx) => listStyleExamples(db, ctx.userId))
  );

  ipcMain.handle(
    CHANNELS.styleExamplesCreate,
    withAuth(db, async (ctx, input: CreateStyleExampleInput): Promise<StyleExample> => {
      const created = createStyleExample(db, ctx.userId, input);
      const extractedStyle = await extractStyleSummary(input.content);
      if (extractedStyle) {
        setStyleExampleExtractedStyle(db, created.id, extractedStyle);
        return { ...created, extractedStyle };
      }
      return created;
    })
  );

  ipcMain.handle(
    CHANNELS.styleExamplesDelete,
    withAuth(db, (ctx, id: string) => deleteStyleExample(db, ctx.userId, id))
  );
}
