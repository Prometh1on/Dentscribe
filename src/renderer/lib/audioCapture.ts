/**
 * Microphone capture with basic noise filtering, encoded to 16kHz mono WAV —
 * the format whisper.cpp and the cloud STT providers expect. Built on raw Web
 * Audio API nodes rather than MediaRecorder because MediaRecorder's native
 * output (WebM/Opus) would need a transcoding step (e.g. ffmpeg) before any
 * STT provider could read it; capturing raw PCM directly avoids that
 * dependency entirely and lets filtering happen inline in the audio graph.
 */

const TARGET_SAMPLE_RATE = 16000;
/** Cuts low-frequency rumble/handling noise below normal speech. */
const HIGH_PASS_HZ = 80;
/** Attenuates the highest drill/scaler harmonics while keeping speech intelligible. Tune per-practice if needed. */
const LOW_PASS_HZ = 8000;

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private chunks: Float32Array[] = [];
  private recording = false;

  get isRecording(): boolean {
    return this.recording;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

    const highPass = this.audioContext.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = HIGH_PASS_HZ;

    const lowPass = this.audioContext.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = LOW_PASS_HZ;

    // ScriptProcessorNode is deprecated in favor of AudioWorklet, but needs no
    // separate module file to load — simplest correct option today. Revisit
    // if processing load or audio glitches show up in practice.
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.recording = true;

    this.processorNode.onaudioprocess = (event) => {
      if (!this.recording) return;
      this.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };

    // A zero-gain node keeps onaudioprocess firing (some browsers require the
    // graph to reach a destination) without playing the mic back out loud —
    // audible mic feedback in a live clinical room would be a real problem.
    const silentGain = this.audioContext.createGain();
    silentGain.gain.value = 0;

    this.sourceNode.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(this.processorNode);
    this.processorNode.connect(silentGain);
    silentGain.connect(this.audioContext.destination);
  }

  async stop(): Promise<{ wavBytes: ArrayBuffer; sampleRateHz: number }> {
    this.recording = false;

    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());

    const nativeSampleRate = this.audioContext?.sampleRate ?? TARGET_SAMPLE_RATE;
    const merged = mergeChunks(this.chunks);
    const resampled = resampleLinear(merged, nativeSampleRate, TARGET_SAMPLE_RATE);
    const wavBytes = encodeWav(resampled, TARGET_SAMPLE_RATE);

    await this.audioContext?.close();
    this.audioContext = null;
    this.chunks = [];

    return { wavBytes, sampleRateHz: TARGET_SAMPLE_RATE };
  }
}

function mergeChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

/** Linear-interpolation resampler — adequate for downsampling speech to 16kHz for STT, not audiophile-grade. */
function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;

  const ratio = fromRate / toRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const lower = Math.floor(srcIndex);
    const upper = Math.min(lower + 1, input.length - 1);
    const frac = srcIndex - lower;
    output[i] = input[lower] * (1 - frac) + input[upper] * frac;
  }

  return output;
}

/** Encodes 16-bit PCM mono WAV with a standard RIFF header. */
function encodeWav(samples: Float32Array, sampleRateHz: number): ArrayBuffer {
  const bytesPerSample = 2;
  const byteRate = sampleRateHz * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, text: string): void {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRateHz, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, bytesPerSample * 8, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }

  return buffer;
}
