import { ipcMain } from 'electron';
import type { DatabaseInstance } from '../db/types';
import { CHANNELS } from './channels';
import { bootstrapFirstUser, login, logout } from '../auth/authService';
import { countUsers } from '../auth/usersRepo';

/**
 * Not wrapped in withAuth — these are the three channels that must work
 * before a session exists (or, for isBootstrapNeeded, before any account
 * exists at all). Every other channel in this app must go through withAuth.
 */
export function registerAuthHandlers(db: DatabaseInstance): void {
  ipcMain.handle(CHANNELS.authIsBootstrapNeeded, () => countUsers(db) === 0);

  ipcMain.handle(CHANNELS.authBootstrapFirstUser, (_event, username: string, password: string) =>
    bootstrapFirstUser(db, username, password)
  );

  ipcMain.handle(CHANNELS.authLogin, (_event, username: string, password: string) => login(db, username, password));

  ipcMain.handle(CHANNELS.authLogout, (_event, token: string) => logout(db, token));
}
