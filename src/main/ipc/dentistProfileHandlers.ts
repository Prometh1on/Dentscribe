import { ipcMain } from 'electron';
import type { DatabaseInstance } from '../db/types';
import type { DentistProfile } from '../../common/types/dentistProfile';
import { CHANNELS } from './channels';
import { withAuth } from './withAuth';
import { getDentistProfile, updateDentistProfile } from '../db/repositories/dentistProfileRepo';

export function registerDentistProfileHandlers(db: DatabaseInstance): void {
  ipcMain.handle(
    CHANNELS.dentistProfileGet,
    withAuth(db, (ctx) => getDentistProfile(db, ctx.userId))
  );

  ipcMain.handle(
    CHANNELS.dentistProfileUpdate,
    withAuth(db, (ctx, patch: Partial<DentistProfile>) => updateDentistProfile(db, ctx.userId, patch))
  );
}
