export const CHANNELS = {
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
  /** Not an invoke channel — main pushes progress on this via event.sender.send(), renderer listens with ipcRenderer.on(). */
  setupProgress: 'setup:progress',
} as const;
