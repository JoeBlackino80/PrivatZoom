/**
 * Detektor citlivých regiónov scény pre web — využíva experimentálne
 * Shape Detection API (TextDetector, BarcodeDetector), ak je dostupné.
 *
 * Cieľ: auto-blur menoviek, dokumentov, obrazoviek, QR/čiarových kódov a ŠPZ,
 * ktoré sa dostanú do záberu. Beží on-device. Keď API nie je k dispozícii,
 * detektor sa správne degraduje (vráti prázdno) — scrub scény vtedy nič nerobí.
 *
 * Pozn.: na mobile (Fáza 1) sa toto mapuje na ML Kit Text Recognition / Object
 * Detection za rovnakým rozhraním ISceneDetector.
 */
import { SensitiveRegion } from '../types.js';
import { FrameSource, ISceneDetector } from './interfaces.js';

interface DetectedBox {
  boundingBox: { x: number; y: number; width: number; height: number };
}
interface ShapeDetector {
  detect(source: CanvasImageSource): Promise<DetectedBox[]>;
}
interface ShapeDetectorCtor {
  new (): ShapeDetector;
}

export class BrowserSceneDetector implements ISceneDetector {
  private textDetector: ShapeDetector | null = null;
  private barcodeDetector: ShapeDetector | null = null;

  constructor() {
    const w = globalThis as unknown as {
      TextDetector?: ShapeDetectorCtor;
      BarcodeDetector?: ShapeDetectorCtor;
    };
    if (w.TextDetector) this.textDetector = new w.TextDetector();
    if (w.BarcodeDetector) this.barcodeDetector = new w.BarcodeDetector();
  }

  /** Je aspoň jeden podporný detektor dostupný? */
  get available(): boolean {
    return this.textDetector !== null || this.barcodeDetector !== null;
  }

  async detectSensitive(frame: FrameSource, _timestampMs: number): Promise<SensitiveRegion[]> {
    const w = (frame.videoWidth as number) || (frame.width as number) || 1;
    const h = (frame.videoHeight as number) || (frame.height as number) || 1;
    const out: SensitiveRegion[] = [];

    const collect = async (det: ShapeDetector | null, kind: SensitiveRegion['kind']) => {
      if (!det) return;
      try {
        const boxes = await det.detect(frame);
        for (const b of boxes) {
          out.push({
            x: b.boundingBox.x / w,
            y: b.boundingBox.y / h,
            width: b.boundingBox.width / w,
            height: b.boundingBox.height / h,
            kind,
            score: 0.9,
          });
        }
      } catch {
        // detektor môže zlyhať na jednotlivom frame — bezpečne ignoruj
      }
    };

    await Promise.all([
      collect(this.textDetector, 'text'),
      collect(this.barcodeDetector, 'code'),
    ]);
    return out;
  }
}
