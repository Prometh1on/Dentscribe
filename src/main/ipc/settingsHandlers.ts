import { ipcMain } from 'electron';
import type { DatabaseInstance } from '../db/types';
import type { AiConfigSchema } from '../config/aiConfig';
import { CHANNELS } from './channels';
import { withAuth } from './withAuth';
import { getAiConfig, updateAiConfig } from '../config/aiConfig';
import { CREDENTIAL_NAMES, setCloudApiKey, clearCloudApiKey, hasCloudApiKey, type CloudCredentialName } from '../ai/credentials';

const VALID_CREDENTIAL_NAMES: string[] = Object.values(CREDENTIAL_NAMES);

function assertValidCredentialName(name: string): asserts name is CloudCredentialName {
  if (!VALID_CREDENTIAL_NAMES.includes(name)) {
    throw new Error(`Unknown credential name: ${name}`);
  }
}

export function registerSettingsHandlers(db: DatabaseInstance): void {
  ipcMain.handle(
    CHANNELS.settingsGetConfig,
    withAuth(db, () => getAiConfig())
  );

  ipcMain.handle(
    CHANNELS.settingsUpdateConfig,
    withAuth(db, (_ctx, patch: Partial<AiConfigSchema>) => updateAiConfig(patch))
  );

  ipcMain.handle(
    CHANNELS.settingsSetCloudApiKey,
    withAuth(db, (_ctx, name: string, value: string) => {
      assertValidCredentialName(name);
      setCloudApiKey(name, value);
    })
  );

  ipcMain.handle(
    CHANNELS.settingsClearCloudApiKey,
    withAuth(db, (_ctx, name: string) => {
      assertValidCredentialName(name);
      clearCloudApiKey(name);
    })
  );

  ipcMain.handle(
    CHANNELS.settingsHasCloudApiKey,
    withAuth(db, (_ctx, name: string) => {
      assertValidCredentialName(name);
      return hasCloudApiKey(name);
    })
  );
}
