import type { DatabaseInstance } from '../db/types';
import { registerAuthHandlers } from './authHandlers';
import { registerStyleExampleHandlers } from './styleExampleHandlers';
import { registerScribeHandlers } from './scribeHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import { registerSetupHandlers } from './setupHandlers';

export function registerAllIpcHandlers(db: DatabaseInstance): void {
  registerAuthHandlers(db);
  registerStyleExampleHandlers(db);
  registerScribeHandlers(db);
  registerSettingsHandlers(db);
  registerSetupHandlers(db);
}
