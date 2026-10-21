import { useCallback, useEffect, useRef, useState } from "react";
import { linesPlayedThrough, type RadioLine } from "../flights/radioScript";
import {
  createKokoroClient,
  type GeneratedAudio,
  type KokoroClient,
} from "../sound/kokoroClient";
import { playThroughRadio } from "../sound/radioEffect";
import { KOKORO_VOICES, lineKey, upcomingLines } from "../sound/radioVoicePlan";
import { createSerialQueue } from "../utils/serialQueue";

export type RadioVoiceStatus = "off" | "loading" | "on" | "error";

export interface RadioVoice {
  status: RadioVoiceStatus;
  /** Download progress 0–100 while status is "loading". */
  progress: number;
  /** True while a line is audibly playing (keeps the replay at 1x until it's finished). */
  isSpeaking: boolean;
  toggle: () => void;
}

/**
 * The HD radio voice: Kokoro speech through a radio effect, off until the user switches it on
 * (the first time downloads the model, ~92 MB, then the browser caches it).
 * Lines are generated a few ahead and spoken as the replay plays through them.
 */
export function useRadioVoice(lines: RadioLine[], time: number): RadioVoice {
  const [status, setStatus] = useState<RadioVoiceStatus>("off");
  const [progress, setProgress] = useState(0);
  const [speakingCount, setSpeakingCount] = useState(0);

  const client = useRef<KokoroClient | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const prepared = useRef(new Map<string, Promise<GeneratedAudio>>());
  const playing = useRef<AudioScheduledSourceNode[]>([]);
  // Lines play strictly in conversation order: each waits for the one before it.
  const playInOrder = useRef(createSerialQueue());
  const nextFreeAt = useRef(0); // AudioContext time when the radio is free again
  const previousTime = useRef(time);
  const previousLines = useRef(lines);

  const stopPlaying = useCallback(() => {
    for (const source of playing.current) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    playing.current = [];
    nextFreeAt.current = 0;
    playInOrder.current = createSerialQueue(); // drop whatever the old conversation had queued
    setSpeakingCount(0);
  }, []);

  /** The audio for a line, generating it once and reusing it after that. */
  const audioFor = useCallback((line: RadioLine) => {
    const key = lineKey(line);
    let audio = prepared.current.get(key);
    if (!audio && client.current) {
      const { voice, speed } = KOKORO_VOICES[line.speaker];
      audio = client.current.generate(line.spoken, voice, speed);
      audio.catch(() => prepared.current.delete(key)); // try again next time
      prepared.current.set(key, audio);
    }
    return audio;
  }, []);

  const speak = useCallback(
    (line: RadioLine, conversation: RadioLine[]) => {
      const audio = audioFor(line);
      if (!audio) return;
      const queue = playInOrder.current;
      queue(async () => {
        const generated = await audio;
        const context = audioContext.current;
        // Another plane was selected or the voice was switched off meanwhile: stay quiet.
        if (
          !context ||
          previousLines.current !== conversation ||
          playInOrder.current !== queue
        ) {
          return;
        }
        const startAt = Math.max(context.currentTime, nextFreeAt.current);
        const { endsAt, sources, voice } = playThroughRadio(
          context,
          generated,
          startAt,
        );
        nextFreeAt.current = endsAt;
        playing.current.push(...sources);
        setSpeakingCount((count) => count + 1);
        voice.onended = () =>
          setSpeakingCount((count) => Math.max(0, count - 1));
      }).catch(() => {
        // This one line failed to generate: skip it, the next one still plays in order.
      });
    },
    [audioFor],
  );

  // Speak the lines the replay just played through; prepare the next few in the background.
  useEffect(() => {
    const before = previousTime.current;
    previousTime.current = time;

    if (lines !== previousLines.current) {
      previousLines.current = lines;
      stopPlaying();
      return;
    }
    if (status !== "on") return;

    for (const line of linesPlayedThrough(lines, before, time))
      speak(line, lines);
    for (const line of upcomingLines(lines, time)) audioFor(line);
  }, [lines, time, status, speak, audioFor, stopPlaying]);

  // Never keep talking after the page or component goes away.
  useEffect(() => stopPlaying, [stopPlaying]);

  const toggle = useCallback(() => {
    if (status === "on") {
      stopPlaying();
      setStatus("off");
      return;
    }
    if (status === "loading") return;

    // Created inside the click, which is what browsers require before playing sound.
    audioContext.current ??= new AudioContext();
    void audioContext.current.resume();
    client.current ??= createKokoroClient();
    setStatus("loading");
    client.current
      .load(setProgress)
      .then(() => setStatus("on"))
      .catch(() => setStatus("error"));
  }, [status, stopPlaying]);

  return { status, progress, isSpeaking: speakingCount > 0, toggle };
}
