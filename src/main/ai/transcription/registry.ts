import type { TranscriptionProvider } from '../../../common/types/transcription';
import type { AiConfigSchema } from '../../config/aiConfig';
import { CREDENTIAL_NAMES, getCloudApiKey } from '../credentials';
import { assertCloudProviderConsent } from '../cloudConsent';
import { LocalWhisperProvider } from './localWhisperProvider';
import { DeepgramProvider } from './deepgramProvider';
import { OpenAiWhisperProvider } from './openaiWhisperProvider';

/** The only place that knows every concrete transcription backend — callers just get a TranscriptionProvider. */
export function createTranscriptionProvider(config: AiConfigSchema): TranscriptionProvider {
  switch (config.transcriptionProvider) {
    case 'local-whisper':
      return new LocalWhisperProvider(config.localWhisper);

    case 'deepgram': {
      assertCloudProviderConsent(config, 'Deepgram');
      const apiKey = getCloudApiKey(CREDENTIAL_NAMES.deepgram);
      if (!apiKey) {
        throw new Error('Deepgram is the selected transcription provider but no API key is stored yet.');
      }
      return new DeepgramProvider({ apiKey, model: config.cloudModelIds.deepgram });
    }

    case 'openai-whisper': {
      assertCloudProviderConsent(config, 'OpenAI');
      const apiKey = getCloudApiKey(CREDENTIAL_NAMES.openai);
      if (!apiKey) {
        throw new Error('OpenAI is the selected transcription provider but no API key is stored yet.');
      }
      return new OpenAiWhisperProvider({ apiKey, model: config.cloudModelIds.openaiTranscription });
    }
  }
}
