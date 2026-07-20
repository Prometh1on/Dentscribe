export interface SetupStatus {
  ollama: {
    /** True if the local Ollama HTTP server responds at all. */
    running: boolean;
    /** True if the configured model (aiConfig.ollama.model) is already pulled. */
    modelPulled: boolean;
  };
  whisper: {
    binaryInstalled: boolean;
    modelInstalled: boolean;
  };
}

/** One line of progress for a long-running setup step, streamed to the renderer as it happens. */
export interface SetupProgressEvent {
  step: 'ollama-install' | 'ollama-pull-model' | 'whisper-install' | 'whisper-model-download';
  message: string;
  /** 0-100 when known; omitted for steps that don't report fine-grained progress. */
  percent?: number;
}

export type WhisperModelSize = 'small' | 'medium' | 'large';
