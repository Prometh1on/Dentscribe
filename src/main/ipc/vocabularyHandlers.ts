import { ipcMain } from 'electron';
import type { DatabaseInstance } from '../db/types';
import type { CreateAbbreviationPreferenceInput, CreateTerminologyPreferenceInput } from '../../common/types/dentistProfile';
import { CHANNELS } from './channels';
import { withAuth } from './withAuth';
import {
  createTerminologyPreference,
  deleteTerminologyPreference,
  listTerminologyPreferences,
} from '../db/repositories/terminologyRepo';
import {
  createAbbreviationPreference,
  deleteAbbreviationPreference,
  listAbbreviationPreferences,
} from '../db/repositories/abbreviationRepo';

/** "Vocabulary" = terminology preferences (avoid/prefer term pairs) + abbreviation preferences, grouped in one handler module since both back the same "My Vocabulary" settings section. */
export function registerVocabularyHandlers(db: DatabaseInstance): void {
  ipcMain.handle(
    CHANNELS.terminologyPreferencesList,
    withAuth(db, (ctx) => listTerminologyPreferences(db, ctx.userId))
  );
  ipcMain.handle(
    CHANNELS.terminologyPreferencesCreate,
    withAuth(db, (ctx, input: CreateTerminologyPreferenceInput) => createTerminologyPreference(db, ctx.userId, input))
  );
  ipcMain.handle(
    CHANNELS.terminologyPreferencesDelete,
    withAuth(db, (ctx, id: string) => deleteTerminologyPreference(db, ctx.userId, id))
  );

  ipcMain.handle(
    CHANNELS.abbreviationPreferencesList,
    withAuth(db, (ctx) => listAbbreviationPreferences(db, ctx.userId))
  );
  ipcMain.handle(
    CHANNELS.abbreviationPreferencesCreate,
    withAuth(db, (ctx, input: CreateAbbreviationPreferenceInput) => createAbbreviationPreference(db, ctx.userId, input))
  );
  ipcMain.handle(
    CHANNELS.abbreviationPreferencesDelete,
    withAuth(db, (ctx, id: string) => deleteAbbreviationPreference(db, ctx.userId, id))
  );
}
