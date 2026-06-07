/**
 * Runtime rozhrania — orchestrátor závisí na týchto abstrakciách, nie na
 * konkrétnej platforme. Flutter/SDK port vymení implementáciu, nie kontrakt.
 */
import { FaceBox, SensitiveRegion } from '../types.js';

/** Zdroj video frameov (HTMLVideoElement v prehliadači). */
export type FrameSource = CanvasImageSource & {
  readonly width?: number;
  readonly height?: number;
  readonly videoWidth?: number;
  readonly videoHeight?: number;
};

/** Detektor tvárí — on-device, vracia normalizované boxy (0..1). */
export interface IFaceDetector {
  detect(frame: FrameSource, timestampMs: number): FaceBox[];
}

/** Segmentácia popredia — vracia masku 0..1 alebo 0..255 na pixel. */
export interface ISegmenter {
  /** Mask aligned na (width × height) frame, alebo null ak nedostupné. */
  segment(
    frame: FrameSource,
    timestampMs: number,
    width: number,
    height: number,
  ): { mask: ArrayLike<number>; width: number; height: number } | null;
}

/** Vykreslenie zaclonených (alebo odhalených) frameov do výstupu. */
export interface IRenderer {
  render(input: import('./renderer.js').RenderInput): void;
}

/**
 * Detektor citlivých regiónov scény (text/menovky, obrazovky, kódy, ŠPZ).
 * On-device; vracia normalizované boxy (0..1). Implementácia je platform-specific
 * (web: Shape Detection API; mobil: ML Kit text/objekt), kontrakt je spoločný.
 */
export interface ISceneDetector {
  detectSensitive(frame: FrameSource, timestampMs: number): SensitiveRegion[] | Promise<SensitiveRegion[]>;
}
