import { useCallback, useEffect, useRef, useState } from "react";
import {
  linesPlayedThrough,
  MAX_PLAYBACK_STEP_SECONDS,
  type RadioLine,
} from "../flights/radioScript";
import {
  createKokoroClient,
  type GeneratedAudio,
  type KokoroClient,
  type LoadStage,
} from "../sound/kokoroClient";
import { playThroughRadio } from "../sound/radioEffect";
import {
  isTooLate,
  KOKORO_VOICES,
  lineAtSeek,
  lineKey,
  upcomingLines,
} from "../sound/radioVoicePlan";
import { createSerialQueue } from "../utils/serialQueue";

export type RadioVoiceStatus = "off" | "loading" | "on" | "error";

/** How long a jump has to stay put before the voice speaks, so a slider drag stays quiet. */
const SEEK_SETTLE_MILLISECONDS = 300;

export interface RadioVoice {
  status: RadioVoiceStatus;
  /** Download progress 0–100 while status is "loading". */
  progress: number;
  /** What "loading" is doing: fetching the model, or warming it up on this device. */
  loadStage: LoadStage;
  /** Why the voice failed, shown on the card: a phone has no console to check. */
  errorMessage: string | null;
  /** True while a line is audibly playing (keeps the replay at 1x until it's finished). */
  isSpeaking: boolean;
  /** Keys (see lineKey) of the lines whose audio is generated and ready to play. */
  readyLineKeys: ReadonlySet<string>;
  /** Keys of the lines that were actually spoken, so the rest can be shown as skipped. */
  spokenLineKeys: ReadonlySet<string>;
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
  const [loadStage, setLoadStage] = useState<LoadStage>("downloading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [speakingCount, setSpeakingCount] = useState(0);
  const [readyLineKeys, setReadyLineKeys] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [spokenLineKeys, setSpokenLineKeys] = useState<ReadonlySet<string>>(
    new Set(),
  );

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
      audio
        .then(() => setReadyLineKeys((ready) => new Set(ready).add(key)))
        .catch(() => prepared.current.delete(key)); // try again next time
      prepared.current.set(key, audio);
    }
    return audio;
  }, []);

  const speak = useCallback(
    (line: RadioLine, conversation: RadioLine[]) => {
      const audio = audioFor(line);
      if (!audio) return;
      const queue = playInOrder.current;
      // When the line was due: everything after this is generation time the replay doesn't wait for.
      const dueAt = performance.now();
      queue(async () => {
        const generated = await audio;
        const context = audioContext.current;
        // Too late to say: the replay has moved on and it would talk over what comes next.
        if (isTooLate(dueAt, performance.now())) return;
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
        setSpokenLineKeys((spoken) => new Set(spoken).add(lineKey(line)));
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
      // Start generating straight away: picking a flight mid-conversation can leave only seconds
      // before the next line is due, and a line that isn't ready in time gets dropped.
      // Every remaining line, not just the next few: a conversation is a handful of lines, and
      // having them all ready is what keeps the exchange from stuttering.
      if (status === "on") {
        for (const line of upcomingLines(lines, time, Number.POSITIVE_INFINITY))
          audioFor(line);
      }
      return;
    }
    if (status !== "on") return;

    // A jump (slider, ±1 min, a flight picked in the search) leaves lines queued for a time the
    // replay is no longer at, so drop them and say the one that belongs here instead.
    const isJump = time < before || time - before >= MAX_PLAYBACK_STEP_SECONDS;
    if (isJump) {
      stopPlaying();
      const line = lineAtSeek(lines, time);
      // Dragging the slider fires this on every frame; wait for it to settle before speaking.
      if (line) {
        const timer = setTimeout(
          () => speak(line, lines),
          SEEK_SETTLE_MILLISECONDS,
        );
        return () => clearTimeout(timer);
      }
      return;
    }

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
      .load((percent, stage) => {
        setProgress(percent);
        setLoadStage(stage);
      })
      .then(() => {
        setErrorMessage(null);
        setStatus("on");
      })
      .catch((error: unknown) => {
        setErrorMessage(String(error));
        setStatus("error");
      });
  }, [status, stopPlaying]);

  return {
    status,
    progress,
    loadStage,
    errorMessage,
    isSpeaking: speakingCount > 0,
    readyLineKeys,
    spokenLineKeys,
    toggle,
  };
}
