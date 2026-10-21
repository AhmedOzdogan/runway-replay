// Plays generated speech the way it sounds on aviation VHF radio: a narrow, slightly nasal
// frequency band, strong compression (every syllable about as loud), a touch of saturation, a
// barely audible hiss, a short push-to-talk click at the start and a squelch tail at the end.
// Real ATC audio is narrow and compressed but quite clean, so every effect here is subtle.

import type { GeneratedAudio } from "./kokoroClient";
import { radioDistortionCurve } from "./radioVoicePlan";

// The radio band: remove the bass and the treble, and lift the "nasal" presence range a little.
const RADIO_LOW_CUT_HZ = 350;
const RADIO_HIGH_CUT_HZ = 3200;
const PRESENCE_HZ = 1800;
const PRESENCE_BOOST_DB = 4;

// Radios even out loud and quiet syllables, which is a big part of the "radio" sound.
const COMPRESSOR_THRESHOLD_DB = -26;
const COMPRESSOR_RATIO = 6;

/** Gentle saturation: warmth, not crackle (higher = crunchier). */
const SATURATION_AMOUNT = 3;
const VOICE_VOLUME = 0.85;

/** Hiss under the voice: just enough to hear it's a radio. */
const HISS_VOLUME = 0.003;

/** Push-to-talk click when the transmission starts. */
const CLICK_SECONDS = 0.03;
const CLICK_VOLUME = 0.02;

/** The "kssh" when the transmission ends: a short burst of noise that fades out. */
const SQUELCH_TAIL_SECONDS = 0.15;
const SQUELCH_TAIL_VOLUME = 0.03;

let saturationCurve: Float32Array | null = null;

/** A buffer of random noise, used for the hiss, the click and the squelch tail. */
function noiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index++) {
    samples[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Play radio-band noise at `startAt` for `seconds`; with `fadeOut`, it dies away smoothly. */
function playNoise(
  context: AudioContext,
  startAt: number,
  seconds: number,
  volume: number,
  sources: AudioScheduledSourceNode[],
  fadeOut = false,
): void {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context, seconds);
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = PRESENCE_HZ;
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, startAt);
  if (fadeOut)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + seconds);
  source.connect(band).connect(gain).connect(context.destination);
  source.start(startAt);
  sources.push(source);
}

/**
 * Schedule `audio` to play through the radio effect at `startAt` (AudioContext time).
 * Returns when it ends (so the next line can start after it), every source (to stop them early),
 * and the voice itself (to know when the speaking is over).
 */
export function playThroughRadio(
  context: AudioContext,
  audio: GeneratedAudio,
  startAt: number,
): {
  endsAt: number;
  sources: AudioScheduledSourceNode[];
  voice: AudioBufferSourceNode;
} {
  const sources: AudioScheduledSourceNode[] = [];

  const buffer = context.createBuffer(
    1,
    audio.samples.length,
    audio.sampleRate,
  );
  buffer.copyToChannel(new Float32Array(audio.samples), 0);
  const voice = context.createBufferSource();
  voice.buffer = buffer;

  const lowCut = context.createBiquadFilter();
  lowCut.type = "highpass";
  lowCut.frequency.value = RADIO_LOW_CUT_HZ;
  const highCut = context.createBiquadFilter();
  highCut.type = "lowpass";
  highCut.frequency.value = RADIO_HIGH_CUT_HZ;
  const presence = context.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = PRESENCE_HZ;
  presence.gain.value = PRESENCE_BOOST_DB;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = COMPRESSOR_THRESHOLD_DB;
  compressor.ratio.value = COMPRESSOR_RATIO;
  const saturation = context.createWaveShaper();
  saturationCurve ??= radioDistortionCurve(SATURATION_AMOUNT);
  saturation.curve = saturationCurve as Float32Array<ArrayBuffer>;
  const volume = context.createGain();
  volume.gain.value = VOICE_VOLUME;

  // Click, voice with a faint hiss underneath, squelch tail.
  const voiceStart = startAt + CLICK_SECONDS;
  const voiceEnd = voiceStart + buffer.duration;
  playNoise(context, startAt, CLICK_SECONDS, CLICK_VOLUME, sources);
  voice
    .connect(lowCut)
    .connect(highCut)
    .connect(presence)
    .connect(compressor)
    .connect(saturation)
    .connect(volume)
    .connect(context.destination);
  voice.start(voiceStart);
  sources.push(voice);
  playNoise(context, voiceStart, buffer.duration, HISS_VOLUME, sources);
  playNoise(
    context,
    voiceEnd,
    SQUELCH_TAIL_SECONDS,
    SQUELCH_TAIL_VOLUME,
    sources,
    true,
  );

  return { endsAt: voiceEnd + SQUELCH_TAIL_SECONDS, sources, voice };
}
