import { describe, it, expect } from 'vitest';
import { VideoAnonymizer } from '../src/anonymizer.js';
import type { FaceBox } from '../src/types.js';
import type { FrameSource, IFaceDetector, IRenderer } from '../src/runtime/interfaces.js';
import type { RenderInput } from '../src/runtime/renderer.js';

/** Fake detektor — počíta volania a vracia vždy jednu tvár. */
class CountingDetector implements IFaceDetector {
  calls = 0;
  detect(_frame: FrameSource, _ts: number): FaceBox[] {
    this.calls++;
    return [{ x: 0.3, y: 0.3, width: 0.4, height: 0.4, score: 0.9 }];
  }
}

/** Fake renderer — zaznamená posledný vstup. */
class RecordingRenderer implements IRenderer {
  last: RenderInput | null = null;
  render(input: RenderInput): void {
    this.last = input;
  }
}

const fakeFrame = { videoWidth: 640, videoHeight: 480 } as unknown as FrameSource;

async function makeEngine() {
  const detector = new CountingDetector();
  const renderer = new RecordingRenderer();
  const engine = new VideoAnonymizer({ failSafe: false });
  await engine.init({ detector, renderer, segmenter: null });
  return { engine, detector, renderer };
}

describe('VideoAnonymizer reveal-on-command', () => {
  it('predvolene je anonymne (revealed=false) a beží detekcia', async () => {
    const { engine, detector, renderer } = await makeEngine();
    engine.processFrame(fakeFrame, 0);
    expect(engine.isRevealed()).toBe(false);
    expect(detector.calls).toBe(1);
    expect(renderer.last?.revealed).toBe(false);
  });

  it('setRevealed(true) obíde detekciu a pošle surový frame', async () => {
    const { engine, detector, renderer } = await makeEngine();
    engine.setRevealed(true);
    engine.processFrame(fakeFrame, 16);
    expect(detector.calls).toBe(0); // detekcia preskočená
    expect(renderer.last?.revealed).toBe(true);
    expect(renderer.last?.faces).toEqual([]);
  });

  it('po pustení reveal sa vráti k anonymizácii', async () => {
    const { engine, detector, renderer } = await makeEngine();
    engine.setRevealed(true);
    engine.processFrame(fakeFrame, 0);
    engine.setRevealed(false);
    engine.processFrame(fakeFrame, 16);
    expect(detector.calls).toBe(1);
    expect(renderer.last?.revealed).toBe(false);
  });

  it('privacy invariant: bytesSent ostáva 0 v oboch stavoch', async () => {
    const { engine } = await makeEngine();
    engine.processFrame(fakeFrame, 0);
    expect(engine.getStats().bytesSent).toBe(0);
    engine.setRevealed(true);
    engine.processFrame(fakeFrame, 16);
    expect(engine.getStats().bytesSent).toBe(0);
  });

  it('init bez canvasu aj renderera zlyhá jasnou chybou', async () => {
    const engine = new VideoAnonymizer();
    await expect(
      engine.init({ detector: new CountingDetector(), segmenter: null }),
    ).rejects.toThrow(/canvas alebo renderer/);
  });
});
