# The radio voice

The simulated ATC conversation is always shown as text. Speaking it is optional: the browser runs
[Kokoro-82M](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) (Apache-2.0) through
[kokoro-js](https://www.npmjs.com/package/kokoro-js) in a Web Worker, downloading the model once.

## Which runtime we ship, and why

`KOKORO_DEVICE` and `KOKORO_DTYPE` in `web/src/sound/radioVoicePlan.ts` are **wasm** and **q8**.
To try another combination, change those two constants and run `npm run dev`; the worker logs
`[voice] generated in … ms` per line in development, which is how the numbers below were taken.

Measured on a Mac (desktop Safari) and an iPhone 13, October 2026:

| runtime | size | desktop | phone |
|---|---|---|---|
| **wasm + q8** (default) | 92 MB | works, 6.5–11 s per line | works, same speed: too slow to keep up |
| wasm + q4 | 305 MB | — | — (q4 is *bigger* than q8: only some operators are 4-bit) |
| webgpu + q4f16 | 155 MB | fast (1.8–3.8 s), **audio garbled** | — |
| webgpu + fp16 | 163 MB | **audio garbled** | — |
| webgpu + fp32 | 325 MB | works, fast | **fails**: stuck at 100%, then retry |

On the iPhone the failure is reported in the card as:

```
Error: no available backend found. ERR: [wasm] RangeError: Out of memory
```

i.e. mobile Safari would not give the tab enough memory to start the WebAssembly runtime at all.
(That run had already tried WebGPU first, so the fallback asked for a second allocation in the
same tab; a cold wasm load may fare better, but not by enough to matter.)

Conclusions:

- Reduced precision breaks this model on WebGPU. Only `fp32` produces correct audio there, which
  kokoro-js also documents as its recommendation for WebGPU.
- `fp32` is 325 MB and exceeds what mobile Safari will give a tab, which is why the phone stops at
  100% and falls back.
- q8 on WebAssembly is correct everywhere and small, so it stays the default.

## Mobile

The voice is hidden on touch devices (`isVoiceSupported`, keyed off a coarse pointer): a phone
needs 6–11 s to generate a line that is due every 9 s, so it never catches up and every line is
skipped. Downloading 92 MB for that is not a trade worth offering.

The one idea left for mobile is **cross-origin isolation** (COOP/COEP headers via a service worker,
since GitHub Pages can't send headers), which lets ONNX Runtime use several threads — typically
3–4×, which would be enough. Tracked as an issue; not attempted yet.

## Playing in time

Generation is slower than the replay, so `useRadioVoice` keeps the two in step:

- the whole conversation is generated when a flight is selected, not a few lines ahead;
- a line that finishes more than `MAX_LATE_MILLISECONDS` after its slot is dropped rather than
  spoken over the next one, and does not slow the replay to 1x;
- each line shows its state in the transcript: ready, generating (blinking amber) or skipped.
