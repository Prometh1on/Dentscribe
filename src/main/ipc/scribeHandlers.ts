import { ipcMain } from 'electron';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import type { DatabaseInstance } from '../db/types';
import type { TranscriptionResult } from '../../common/types/transcription';
import { CHANNELS } from './channels';
import { withAuth } from './withAuth';
import { formatNote } from '../ai/formatting/noteFormatter';
import { createTranscriptionProvider } from '../ai/transcription/registry';
import { getAiConfig } from '../config/aiConfig';

export function registerScribeHandlers(db: DatabaseInstance): void {
  ipcMain.handle(
    CHANNELS.scribeFormatNote,
    withAuth(db, (ctx, transcriptionResult: TranscriptionResult) =>
      formatNote(db, ctx.userId, { transcriptionResult })
    )
  );

  ipcMain.handle(
    CHANNELS.scribeTranscribeAudio,
    withAuth(db, async (_ctx, wavBytes: ArrayBuffer, sampleRateHz: number): Promise<TranscriptionResult> => {
      const provider = createTranscriptionProvider(getAiConfig());
      const tempPath = join(tmpdir(), `dentiscribe-${randomBytes(8).toString('hex')}.wav`);

      await writeFile(tempPath, Buffer.from(wavBytes));
      try {
        return await provider.transcribe({ filePath: tempPath, sampleRateHz });
      } finally {
        // Zero-retention: the temp recording is deleted immediately after transcription,
        // success or failure — no raw audio persists anywhere once this call returns.
        await unlink(tempPath).catch(() => {});
      }
    })
  );
}
