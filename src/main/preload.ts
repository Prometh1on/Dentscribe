import { contextBridge, ipcRenderer } from 'electron';
import type { AuthResult } from '../common/types/auth';
import type { CreateStyleExampleInput, StyleExample } from '../common/types/styleExample';
import type { TranscriptionResult } from '../common/types/transcription';
import type { AiConfigSchema } from '../common/types/aiConfig';
import type { SetupProgressEvent, SetupStatus, WhisperModelSize } from '../common/types/setup';

/**
 * Duplicated from src/main/ipc/channels.ts rather than imported. This was a
 * real bug, not a style choice: with `sandbox: true` on the BrowserWindow
 * (which we want, for security), Electron's preload context cannot `require()`
 * separate local application files — only a curated allowlist of Node
 * built-ins. Importing `CHANNELS` from another file compiled to exactly that
 * kind of `require()` and silently failed, leaving `window.dentiScribe`
 * undefined and the whole app stuck on "Loading…" — caught by actually
 * launching the packaged app and checking `typeof window.dentiScribe` in the
 * real renderer, not by typecheck/lint (both passed the whole time). Keep
 * this file's only value-level import as `electron` itself.
 */
const CHANNELS = {
  authIsBootstrapNeeded: 'auth:isBootstrapNeeded',
  authBootstrapFirstUser: 'auth:bootstrapFirstUser',
  authLogin: 'auth:login',
  authLogout: 'auth:logout',

  styleExamplesList: 'styleExamples:list',
  styleExamplesCreate: 'styleExamples:create',
  styleExamplesDelete: 'styleExamples:delete',

  scribeFormatNote: 'scribe:formatNote',
  scribeTranscribeAudio: 'scribe:transcribeAudio',

  settingsGetConfig: 'settings:getConfig',
  settingsUpdateConfig: 'settings:updateConfig',
  settingsSetCloudApiKey: 'settings:setCloudApiKey',
  settingsClearCloudApiKey: 'settings:clearCloudApiKey',
  settingsHasCloudApiKey: 'settings:hasCloudApiKey',

  setupCheckStatus: 'setup:checkStatus',
  setupInstallOllama: 'setup:installOllama',
  setupPullOllamaModel: 'setup:pullOllamaModel',
  setupInstallWhisper: 'setup:installWhisper',
  setupDownloadWhisperModel: 'setup:downloadWhisperModel',
  setupProgress: 'setup:progress',
} as const;

/**
 * The session token lives only in this module's closure. contextIsolation
 * means the page's JS never sees this variable — it only ever gets the
 * functions exposed below, and none of them return the token itself. A page
 * compromised by XSS still can't read the token out of module scope here.
 */
let sessionToken: string | null = null;

function toAuthResult(result: AuthResult & { token: string }): AuthResult {
  sessionToken = result.token;
  return { userId: result.userId, username: result.username };
}

async function login(username: string, password: string): Promise<AuthResult> {
  const result = await ipcRenderer.invoke(CHANNELS.authLogin, username, password);
  return toAuthResult(result);
}

async function bootstrapFirstUser(username: string, password: string): Promise<AuthResult> {
  const result = await ipcRenderer.invoke(CHANNELS.authBootstrapFirstUser, username, password);
  return toAuthResult(result);
}

async function logout(): Promise<void> {
  const token = sessionToken;
  sessionToken = null;
  if (token) {
    await ipcRenderer.invoke(CHANNELS.authLogout, token);
  }
}

function isBootstrapNeeded(): Promise<boolean> {
  return ipcRenderer.invoke(CHANNELS.authIsBootstrapNeeded);
}

function isAuthenticated(): boolean {
  return sessionToken !== null;
}

function invokeAuthenticated<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (!sessionToken) {
    return Promise.reject(new Error('Not authenticated'));
  }
  return ipcRenderer.invoke(channel, sessionToken, ...args);
}

contextBridge.exposeInMainWorld('dentiScribe', {
  version: process.env.npm_package_version ?? '0.1.0',

  auth: {
    isBootstrapNeeded,
    bootstrapFirstUser,
    login,
    logout,
    isAuthenticated,
  },

  styleExamples: {
    list: () => invokeAuthenticated<StyleExample[]>(CHANNELS.styleExamplesList),
    create: (input: CreateStyleExampleInput) =>
      invokeAuthenticated<StyleExample>(CHANNELS.styleExamplesCreate, input),
    delete: (id: string) => invokeAuthenticated<void>(CHANNELS.styleExamplesDelete, id),
  },

  scribe: {
    formatNote: (transcriptionResult: TranscriptionResult) =>
      invokeAuthenticated<string>(CHANNELS.scribeFormatNote, transcriptionResult),
    transcribeAudio: (wavBytes: ArrayBuffer, sampleRateHz: number) =>
      invokeAuthenticated<TranscriptionResult>(CHANNELS.scribeTranscribeAudio, wavBytes, sampleRateHz),
  },

  settings: {
    getConfig: () => invokeAuthenticated<AiConfigSchema>(CHANNELS.settingsGetConfig),
    updateConfig: (patch: Partial<AiConfigSchema>) =>
      invokeAuthenticated<void>(CHANNELS.settingsUpdateConfig, patch),
    setCloudApiKey: (name: string, value: string) =>
      invokeAuthenticated<void>(CHANNELS.settingsSetCloudApiKey, name, value),
    clearCloudApiKey: (name: string) => invokeAuthenticated<void>(CHANNELS.settingsClearCloudApiKey, name),
    hasCloudApiKey: (name: string) => invokeAuthenticated<boolean>(CHANNELS.settingsHasCloudApiKey, name),
  },

  setup: {
    checkStatus: () => invokeAuthenticated<SetupStatus>(CHANNELS.setupCheckStatus),
    installOllama: () => invokeAuthenticated<void>(CHANNELS.setupInstallOllama),
    pullOllamaModel: () => invokeAuthenticated<void>(CHANNELS.setupPullOllamaModel),
    installWhisper: () => invokeAuthenticated<void>(CHANNELS.setupInstallWhisper),
    downloadWhisperModel: (size: WhisperModelSize) =>
      invokeAuthenticated<void>(CHANNELS.setupDownloadWhisperModel, size),
    onProgress: (callback: (event: SetupProgressEvent) => void) => {
      const listener = (_event: unknown, progress: SetupProgressEvent) => callback(progress);
      ipcRenderer.on(CHANNELS.setupProgress, listener);
      return () => ipcRenderer.removeListener(CHANNELS.setupProgress, listener);
    },
  },
});
