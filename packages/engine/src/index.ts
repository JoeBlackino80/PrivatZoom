/**
 * @zavoj/engine — prenosné on-device anonymizačné jadro.
 *
 * Verejné API:
 *   - VideoAnonymizer: orchestrátor (detekcia → segmentácia → efekt → render)
 *   - VoiceAnonymizer: anonymizácia hlasu (Web Audio)
 *   - core/*: čisté, testovateľné, portovateľné jadro (pixely, audio, fail-safe)
 */
export { VideoAnonymizer } from './anonymizer.js';
export type { InitOptions } from './anonymizer.js';

export { VoiceAnonymizer } from './runtime/voiceAnonymizer.js';
export { CanvasRenderer } from './runtime/renderer.js';
export type { RenderInput } from './runtime/renderer.js';
export { MediaPipeFaceDetector } from './runtime/faceDetector.js';
export { MediaPipeSegmenter } from './runtime/segmenter.js';
export { BrowserSceneDetector } from './runtime/sceneDetector.js';
export type {
  IFaceDetector,
  ISegmenter,
  ISceneDetector,
  IRenderer,
  FrameSource,
} from './runtime/interfaces.js';

export * from './types.js';
export * as core from './core/index.js';

// fast-path shadery (referenčný kontrakt pre WebGL / Metal / OpenGL ES)
export * as shaders from './runtime/shaders.js';
