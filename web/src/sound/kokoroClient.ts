// The page's side of the Kokoro worker: turns its messages into simple promises.

import type { FromWorker, ToWorker } from "./kokoro.worker";
import {
  type DownloadProgress,
  downloadPercent,
  trackDownload,
} from "./radioVoicePlan";

export interface GeneratedAudio {
  samples: Float32Array;
  sampleRate: number;
}

export interface KokoroClient {
  /** Download (first time) and start the model; `onProgress` gets 0–100 while downloading. */
  load: (onProgress: (percent: number) => void) => Promise<void>;
  generate: (
    text: string,
    voice: string,
    speed: number,
  ) => Promise<GeneratedAudio>;
}

export function createKokoroClient(): KokoroClient {
  // Vite bundles the worker (and kokoro-js inside it) as a separate file, loaded only now.
  const worker = new Worker(new URL("./kokoro.worker.ts", import.meta.url), {
    type: "module",
  });
  const send = (message: ToWorker) => worker.postMessage(message);

  let loading: Promise<void> | null = null;
  let nextId = 0;
  const pending = new Map<
    number,
    { resolve: (audio: GeneratedAudio) => void; reject: (error: Error) => void }
  >();
  let onLoadProgress: (percent: number) => void = () => {};
  let finishLoading: {
    resolve: () => void;
    reject: (error: Error) => void;
  } | null = null;
  let download: DownloadProgress = {};

  worker.onmessage = (event: MessageEvent<FromWorker>) => {
    const message = event.data;
    switch (message.type) {
      case "progress":
        download = trackDownload(download, message.report);
        onLoadProgress(downloadPercent(download));
        break;
      case "ready":
        finishLoading?.resolve();
        break;
      case "loadError":
        finishLoading?.reject(new Error(message.message));
        loading = null; // allow another try
        break;
      case "audio":
        pending.get(message.id)?.resolve({
          samples: message.samples,
          sampleRate: message.sampleRate,
        });
        pending.delete(message.id);
        break;
      case "generateError":
        pending.get(message.id)?.reject(new Error(message.message));
        pending.delete(message.id);
        break;
    }
  };

  return {
    load(onProgress) {
      onLoadProgress = onProgress;
      loading ??= new Promise<void>((resolve, reject) => {
        finishLoading = { resolve, reject };
        send({ type: "load" });
      });
      return loading;
    },
    generate(text, voice, speed) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        send({ type: "generate", id, text, voice, speed });
      });
    },
  };
}
