/**
 * On-device segmentácia popredia (osoba vs. pozadie) cez MediaPipe
 * ImageSegmenter (selfie model). Mask sa použije na scrub pozadia a siluetu.
 */
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';
import { FrameSource, ISegmenter } from './interfaces.js';

export interface SegmenterOptions {
  wasmBasePath: string;
  /** URL k .tflite selfie-segmentation modelu. */
  modelAssetPath: string;
}

export class MediaPipeSegmenter implements ISegmenter {
  private constructor(private readonly seg: ImageSegmenter) {}

  static async create(opts: SegmenterOptions): Promise<MediaPipeSegmenter> {
    const fileset = await FilesetResolver.forVisionTasks(opts.wasmBasePath);
    const seg = await ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: opts.modelAssetPath },
      runningMode: 'VIDEO',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
    return new MediaPipeSegmenter(seg);
  }

  segment(
    frame: FrameSource,
    timestampMs: number,
    _width: number,
    _height: number,
  ): { mask: ArrayLike<number>; width: number; height: number } | null {
    let result: { mask: ArrayLike<number>; width: number; height: number } | null = null;
    this.seg.segmentForVideo(
      frame as unknown as HTMLVideoElement,
      timestampMs,
      (res) => {
        const conf = res.confidenceMasks?.[0];
        if (conf) {
          const arr = conf.getAsFloat32Array();
          result = { mask: arr, width: conf.width, height: conf.height };
        }
        res.close();
      },
    );
    return result;
  }
}
