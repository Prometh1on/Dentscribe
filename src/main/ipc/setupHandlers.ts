import { ipcMain } from 'electron';
import type { DatabaseInstance } from '../db/types';
import type { SetupProgressEvent, SetupStatus, WhisperModelSize } from '../../common/types/setup';
import { CHANNELS } from './channels';
import { withAuth } from './withAuth';
import { getAiConfig, updateAiConfig } from '../config/aiConfig';
import { checkOllamaRunning, checkModelPulled, installOllama, pullModel } from '../setup/ollamaSetup';
import { checkWhisperFiles, installWhisperBinary, downloadWhisperModel } from '../setup/whisperSetup';

export function registerSetupHandlers(db: DatabaseInstance): void {
  ipcMain.handle(
    CHANNELS.setupCheckStatus,
    withAuth(db, async (): Promise<SetupStatus> => {
      const config = getAiConfig();
      const [running, modelPulled] = await Promise.all([
        checkOllamaRunning(config.ollama.host),
        checkModelPulled(config.ollama.host, config.ollama.model),
      ]);
      const whisper = checkWhisperFiles(config.localWhisper.binaryPath, config.localWhisper.modelPath);
      return { ollama: { running, modelPulled }, whisper };
    })
  );

  ipcMain.handle(
    CHANNELS.setupInstallOllama,
    withAuth(db, async (ctx) => {
      const sendProgress = (progress: SetupProgressEvent) => ctx.event.sender.send(CHANNELS.setupProgress, progress);
      await installOllama(sendProgress);
    })
  );

  ipcMain.handle(
    CHANNELS.setupPullOllamaModel,
    withAuth(db, async (ctx) => {
      const sendProgress = (progress: SetupProgressEvent) => ctx.event.sender.send(CHANNELS.setupProgress, progress);
      const config = getAiConfig();
      await pullModel(config.ollama.host, config.ollama.model, sendProgress);
    })
  );

  ipcMain.handle(
    CHANNELS.setupInstallWhisper,
    withAuth(db, async (ctx) => {
      const sendProgress = (progress: SetupProgressEvent) => ctx.event.sender.send(CHANNELS.setupProgress, progress);
      const binaryPath = await installWhisperBinary(sendProgress);
      updateAiConfig({ localWhisper: { ...getAiConfig().localWhisper, binaryPath } });
    })
  );

  ipcMain.handle(
    CHANNELS.setupDownloadWhisperModel,
    withAuth(db, async (ctx, size: WhisperModelSize) => {
      const sendProgress = (progress: SetupProgressEvent) => ctx.event.sender.send(CHANNELS.setupProgress, progress);
      const modelPath = await downloadWhisperModel(size, sendProgress);
      updateAiConfig({ localWhisper: { ...getAiConfig().localWhisper, modelPath } });
    })
  );
}
