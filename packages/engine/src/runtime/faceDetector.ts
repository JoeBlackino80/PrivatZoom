/**
 * On-device detekcia tváre cez MediaPipe Tasks Vision (FaceDetector).
 * Beží v prehliadači cez WASM. Žiadny frame neopúšťa zariadenie — model sa
 * stiahne raz pri init a dá sa bundlovať pre plne offline beh.
 */
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { FaceBox } from '../types.js';
import { FrameSource, IFaceDetector } from './interfaces.js';

export interface FaceDetectorOptions {
  /** URL k WASM fileset (napr. CDN alebo lokálny bundle). */
  wasmBasePath: string;
  /** URL k .tflite modelu detektora tváre. */
  modelAssetPath: string;
  /** Minimálne skóre detekcie 0..1. */
  minScore?: number;
}

export class MediaPipeFaceDetector implements IFaceDetector {
  private constructor(private readonly detector: FaceDetector) {}

  static async create(opts: FaceDetectorOptions): Promise<MediaPipeFaceDetector> {
    const fileset = await FilesetResolver.forVisionTasks(opts.wasmBasePath);
    const detector = await FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: opts.modelAssetPath },
      runningMode: 'VIDEO',
      minDetectionConfidence: opts.minScore ?? 0.5,
    });
    return new MediaPipeFaceDetector(detector);
  }

  detect(frame: FrameSource, timestampMs: number): FaceBox[] {
    const w = (frame.videoWidth as number) || (frame.width as number) || 1;
    const h = (frame.videoHeight as number) || (frame.height as number) || 1;
    const result = this.detector.detectForVideo(frame as unknown as HTMLVideoElement, timestampMs);
    return result.detections.map((d) => {
      const bb = d.boundingBox ?? { originX: 0, originY: 0, width: 0, height: 0 };
      const score = d.categories?.[0]?.score ?? 1;
      return {
        x: bb.originX / w,
        y: bb.originY / h,
        width: bb.width / w,
        height: bb.height / h,
        score,
      };
    });
  }
}
