import { ipcMain } from 'electron';
import type { DatabaseInstance } from '../db/types';
import type { CreateStaffNameInput } from '../../common/types/staffName';
import { CHANNELS } from './channels';
import { withAuth } from './withAuth';
import { createStaffName, deleteStaffName, listStaffNames } from '../db/repositories/staffNamesRepo';

export function registerStaffNameHandlers(db: DatabaseInstance): void {
  ipcMain.handle(
    CHANNELS.staffNamesList,
    withAuth(db, (ctx) => listStaffNames(db, ctx.userId))
  );

  ipcMain.handle(
    CHANNELS.staffNamesCreate,
    withAuth(db, (ctx, input: CreateStaffNameInput) => createStaffName(db, ctx.userId, input))
  );

  ipcMain.handle(
    CHANNELS.staffNamesDelete,
    withAuth(db, (ctx, id: string) => deleteStaffName(db, ctx.userId, id))
  );
}
