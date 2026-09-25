import { initWhisper, type WhisperContext } from 'whisper.rn/index';
import { File } from 'expo-file-system';

// Biases the model towards the clinical/medication terms carers actually say.
const VOCABULARY =
  'Care documentation: blood pressure, pulse, medication, mobility, ' +
  'pain, appetite, personal care, resident, caregiver, physician, ' +
  'Amlodipine, Atorvastatin, Metformin, Donepezil, Sertraline';

let ctx: WhisperContext | null = null;
let ctxPromise: Promise<WhisperContext> | null = null;

// Load once and keep the context. Loading costs one to three seconds and
// must not be repeated per note — call this when a carer signs in so the
// model is already loaded before the first recording.
export async function initTranscription(): Promise<WhisperContext> {
  if (ctx) return ctx;
  if (!ctxPromise) {
    ctxPromise = initWhisper({
      filePath: require('../../models/ggml-base.en-q5_1.bin'),
    });
  }
  ctx = await ctxPromise;
  return ctx;
}

export async function transcribe(path: string): Promise<string | null> {
  try {
    const whisper = await initTranscription();
    const { promise } = whisper.transcribe(path, {
      language: 'en',
      prompt: VOCABULARY,
      translate: false,
      maxThreads: 4,
    });
    const { result } = await promise;
    return result?.trim() ?? null;
  } catch (e) {
    console.error('Transcription failed', e);
    return null;
  } finally {
    // Delete the audio immediately and unconditionally. This is not an
    // optimisation: it is the reason no recording ever leaves the device
    // or persists on it after transcription.
    try {
      new File(path).delete();
    } catch {}
  }
}
