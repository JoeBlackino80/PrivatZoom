/**
 * VideoAnonymizer — verejné API engine. Spája on-device detekciu, segmentáciu,
 * fail-safe a renderer do jedného volania na frame.
 *
 * Privacy invariant: bytesSent ostáva 0 počas celého života objektu.
 */
import { AnonConfig, EngineStats, FaceBox } from './types.js';
import { normalizeConfig } from './core/config.js';
import { FailSafe, FailSafeOptions } from './core/failsafe.js';
import { hashSeed } from './core/audio.js';
import { CanvasRenderer } from './runtime/renderer.js';
import { MediaPipeFaceDetector } from './runtime/faceDetector.js';
import { MediaPipeSegmenter } from './runtime/segmenter.js';
import { FrameSource, IFaceDetector, IRenderer, ISegmenter } from './runtime/interfaces.js';

export interface InitOptions {
  /** Výstupný canvas pre zaclonený náhľad. Nepovinné, ak je daný `renderer`. */
  canvas?: HTMLCanvasElement;
  /** Základná cesta k MediaPipe WASM fileset. */
  wasmBasePath?: string;
  /** URL k modelu detektora tváre (.tflite). */
  faceModelUrl?: string;
  /** URL k selfie-segmentation modelu (.tflite). Voliteľné (scrub/silueta). */
  segModelUrl?: string;
  /** Seed persony — stabilná farba siluety/avatara a hlas. */
  personaSeed?: string;
  /** Override fail-safe parametrov. */
  failSafe?: Partial<FailSafeOptions>;
  /** Injektovateľné implementácie (test / Flutter / SDK port). */
  detector?: IFaceDetector;
  segmenter?: ISegmenter | null;
  renderer?: IRenderer;
}

export class VideoAnonymizer {
  private config: AnonConfig;
  private renderer: IRenderer | null = null;
  private detector: IFaceDetector | null = null;
  private segmenter: ISegmenter | null = null;
  private failSafe: FailSafe;
  private personaSeed = 0;
  private revealed = false;

  // telemetria
  private readonly bytesSent = 0; // invariant
  private faces = 0;
  private lastTs = 0;
  private fps = 0;

  constructor(config: Partial<AnonConfig> = {}) {
    this.config = normalizeConfig(config);
    this.failSafe = new FailSafe();
  }

  async init(opts: InitOptions): Promise<void> {
    if (opts.renderer) {
      this.renderer = opts.renderer;
    } else if (opts.canvas) {
      this.renderer = new CanvasRenderer(opts.canvas);
    } else {
      throw new Error('ZÁVOJ: init vyžaduje canvas alebo renderer.');
    }
    this.personaSeed = hashSeed(opts.personaSeed ?? 'zavoj-default');
    this.failSafe = new FailSafe(opts.failSafe ?? {});

    if (opts.detector) {
      this.detector = opts.detector;
    } else {
      if (!opts.wasmBasePath || !opts.faceModelUrl) {
        throw new Error('ZÁVOJ: init vyžaduje wasmBasePath + faceModelUrl alebo detector.');
      }
      this.detector = await MediaPipeFaceDetector.create({
        wasmBasePath: opts.wasmBasePath,
        modelAssetPath: opts.faceModelUrl,
      });
    }

    if (opts.segmenter !== undefined) {
      this.segmenter = opts.segmenter;
    } else if (opts.segModelUrl && opts.wasmBasePath) {
      this.segmenter = await MediaPipeSegmenter.create({
        wasmBasePath: opts.wasmBasePath,
        modelAssetPath: opts.segModelUrl,
      });
    }
  }

  setConfig(config: Partial<AnonConfig>): void {
    this.config = normalizeConfig({ ...this.config, ...config });
  }

  getConfig(): AnonConfig {
    return { ...this.config };
  }

  /**
   * Reveal-on-command: výslovné odhalenie tváre používateľom. Kým je true,
   * prejde surový frame. Predvolene je vždy false (anonymne defaultne).
   */
  setRevealed(revealed: boolean): void {
    this.revealed = revealed;
  }

  isRevealed(): boolean {
    return this.revealed;
  }

  /** Spracuje jeden frame a vyrenderuje zaclonený výstup do canvasu. */
  processFrame(frame: FrameSource, timestampMs: number): void {
    if (!this.renderer || !this.detector) {
      throw new Error('ZÁVOJ: engine nie je inicializovaný (volaj init).');
    }

    // Reveal: obíď detekciu/efekt, ukáž surový frame (rýchle a jednoznačné).
    if (this.revealed) {
      this.renderer.render({
        frame,
        faces: [],
        mask: null,
        config: this.config,
        covered: false,
        personaSeed: this.personaSeed,
        revealed: true,
      });
      this.updateFps(timestampMs);
      return;
    }

    const faces: FaceBox[] = this.detector.detect(frame, timestampMs);
    this.faces = faces.length;

    // fail-safe: aspoň jedna dôveryhodná tvár?
    const faceDetected = faces.some((f) => f.score >= 0.4) || !this.config.failSafe;
    const covered = this.config.failSafe ? this.failSafe.update(faceDetected) : false;

    let mask = null;
    const needMask = this.config.scrubBackground !== 'off' || this.config.mode === 'silhouette';
    if (!covered && needMask && this.segmenter) {
      const w = (frame.videoWidth as number) || (frame.width as number) || 0;
      const h = (frame.videoHeight as number) || (frame.height as number) || 0;
      mask = this.segmenter.segment(frame, timestampMs, w, h);
    }

    this.renderer.render({
      frame,
      faces,
      mask,
      config: this.config,
      covered,
      personaSeed: this.personaSeed,
      revealed: false,
    });

    this.updateFps(timestampMs);
  }

  getStats(): EngineStats {
    return {
      bytesSent: this.bytesSent,
      fps: Math.round(this.fps),
      faces: this.faces,
      covered: this.failSafe.isCovered(),
    };
  }

  private updateFps(ts: number): void {
    if (this.lastTs > 0) {
      const dt = ts - this.lastTs;
      if (dt > 0) {
        const inst = 1000 / dt;
        this.fps = this.fps === 0 ? inst : this.fps * 0.9 + inst * 0.1;
      }
    }
    this.lastTs = ts;
  }
}
