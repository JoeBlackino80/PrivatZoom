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
import { FrameSource, IFaceDetector, ISegmenter } from './runtime/interfaces.js';

export interface InitOptions {
  /** Výstupný canvas pre zaclonený náhľad. */
  canvas: HTMLCanvasElement;
  /** Základná cesta k MediaPipe WASM fileset. */
  wasmBasePath: string;
  /** URL k modelu detektora tváre (.tflite). */
  faceModelUrl: string;
  /** URL k selfie-segmentation modelu (.tflite). Voliteľné (scrub/silueta). */
  segModelUrl?: string;
  /** Seed persony — stabilná farba siluety/avatara a hlas. */
  personaSeed?: string;
  /** Override fail-safe parametrov. */
  failSafe?: Partial<FailSafeOptions>;
  /** Injektovateľné implementácie (test / Flutter / SDK port). */
  detector?: IFaceDetector;
  segmenter?: ISegmenter | null;
}

export class VideoAnonymizer {
  private config: AnonConfig;
  private renderer: CanvasRenderer | null = null;
  private detector: IFaceDetector | null = null;
  private segmenter: ISegmenter | null = null;
  private failSafe: FailSafe;
  private personaSeed = 0;

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
    this.renderer = new CanvasRenderer(opts.canvas);
    this.personaSeed = hashSeed(opts.personaSeed ?? 'zavoj-default');
    this.failSafe = new FailSafe(opts.failSafe ?? {});

    this.detector =
      opts.detector ??
      (await MediaPipeFaceDetector.create({
        wasmBasePath: opts.wasmBasePath,
        modelAssetPath: opts.faceModelUrl,
      }));

    if (opts.segmenter !== undefined) {
      this.segmenter = opts.segmenter;
    } else if (opts.segModelUrl) {
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

  /** Spracuje jeden frame a vyrenderuje zaclonený výstup do canvasu. */
  processFrame(frame: FrameSource, timestampMs: number): void {
    if (!this.renderer || !this.detector) {
      throw new Error('ZÁVOJ: engine nie je inicializovaný (volaj init).');
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
