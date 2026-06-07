/**
 * Canvas2D renderer — spoľahlivá referenčná cesta, ktorá používa pure jadro
 * (core/pixels). Beží všade bez GPU závislostí a je verifikovateľná na
 * zariadení. WebGL/Metal fast-path (shaders.ts) počíta to isté.
 */
import { AnonConfig, FaceBox, RGB, SensitiveRegion } from '../types.js';
import {
  pixelate,
  boxBlur,
  silhouette,
  compositeByMask,
  blurBoxes,
  fill,
} from '../core/pixels.js';
import { intensityToBlockSize, intensityToBlurRadius } from '../core/config.js';
import { FrameSource } from './interfaces.js';

const COVER_COLOR: RGB = { r: 17, g: 18, b: 23 };

/** Persona farba zo seedu (konzistentná silueta/avatar). */
function personaColor(seed: number): RGB {
  const hue = seed % 360;
  return hslToRgb(hue, 0.45, 0.45);
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export interface RenderInput {
  frame: FrameSource;
  faces: FaceBox[];
  mask: { mask: ArrayLike<number>; width: number; height: number } | null;
  config: AnonConfig;
  covered: boolean;
  /** Seed persony (stabilná farba pre siluetu/avatar). */
  personaSeed: number;
  /** Reveal-on-command: keď true, prejde surový frame (používateľ odhalil tvár). */
  revealed: boolean;
  /** Citlivé regióny scény na auto-blur (menovky, dokumenty, obrazovky, ŠPZ). */
  sensitiveBoxes: SensitiveRegion[];
}

export class CanvasRenderer {
  private readonly out: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly work: HTMLCanvasElement;
  private readonly wctx: CanvasRenderingContext2D;

  constructor(output: HTMLCanvasElement) {
    this.out = output;
    this.ctx = must(output.getContext('2d', { willReadFrequently: true }));
    this.work = document.createElement('canvas');
    this.wctx = must(this.work.getContext('2d', { willReadFrequently: true }));
  }

  private frameSize(frame: FrameSource): { w: number; h: number } {
    const w = (frame.videoWidth as number) || (frame.width as number) || this.out.width;
    const h = (frame.videoHeight as number) || (frame.height as number) || this.out.height;
    return { w, h };
  }

  render(input: RenderInput): void {
    const { frame, faces, mask, config, covered, personaSeed, revealed } = input;
    const { w, h } = this.frameSize(frame);
    if (w === 0 || h === 0) return;

    this.out.width = w;
    this.out.height = h;
    this.work.width = w;
    this.work.height = h;

    // Reveal-on-command: výslovné rozhodnutie používateľa ukázať tvár.
    // Obíde anonymizáciu (ale len kým reveal trvá) a viditeľne to označí.
    if (revealed) {
      this.ctx.drawImage(frame, 0, 0, w, h);
      this.drawRevealBadge(w, h);
      return;
    }

    // Fail-safe: nič odkryté neprejde.
    if (covered) {
      this.drawCover(w, h);
      return;
    }

    // 1) nakresli surový frame do work canvasu a vytiahni pixely
    this.wctx.drawImage(frame, 0, 0, w, h);
    const img = this.wctx.getImageData(0, 0, w, h);
    let data: Uint8ClampedArray = img.data;

    // 2) scrub pozadia (prostredie ťa prezradí)
    if (config.scrubBackground !== 'off' && mask) {
      data = this.applyBackgroundScrub(data, w, h, mask, config);
    }

    // 3) efekt na tvár(e)
    data = this.applyFaceEffect(data, w, h, faces, mask, config, personaSeed);

    // 4) scrub scény — rozmaž citlivé regióny (menovky, dokumenty, obrazovky, ŠPZ)
    if (config.sceneScrub && input.sensitiveBoxes.length > 0) {
      data = blurBoxes(data, w, h, input.sensitiveBoxes, Math.max(12, intensityToBlurRadius(1)));
    }

    // zapíš výsledok späť do pôvodného ImageData a vyrenderuj
    img.data.set(data);
    this.ctx.putImageData(img, 0, 0);
  }

  private drawRevealBadge(_w: number, h: number): void {
    const pad = Math.round(h / 40);
    this.ctx.font = `${Math.round(h / 28)}px system-ui, sans-serif`;
    const label = '● LIVE — tvár odhalená';
    const tw = this.ctx.measureText(label).width;
    this.ctx.fillStyle = 'rgba(0,0,0,0.55)';
    this.ctx.fillRect(pad, pad, tw + pad * 2, Math.round(h / 18));
    this.ctx.fillStyle = '#ff5a5a';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, pad * 2, pad + Math.round(h / 36));
  }

  private drawCover(w: number, h: number): void {
    this.ctx.fillStyle = `rgb(${COVER_COLOR.r},${COVER_COLOR.g},${COVER_COLOR.b})`;
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.ctx.font = `${Math.round(h / 18)}px system-ui, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🛡  clona aktívna — tvár sa hľadá', w / 2, h / 2);
  }

  private applyBackgroundScrub(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    mask: { mask: ArrayLike<number>; width: number; height: number },
    config: AnonConfig,
  ): Uint8ClampedArray {
    const resized = resizeMask(mask, w, h);
    let background: Uint8ClampedArray;
    if (config.scrubBackground === 'blur') {
      background = boxBlur(data, w, h, Math.max(8, intensityToBlurRadius(0.8)));
    } else {
      // 'replace' — jednoduchá hladká výplň (prostredie úplne preč)
      background = fill(w, h, { r: 24, g: 26, b: 32 });
    }
    return compositeByMask(data, background, resized, w, h);
  }

  private applyFaceEffect(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    faces: FaceBox[],
    mask: { mask: ArrayLike<number>; width: number; height: number } | null,
    config: AnonConfig,
    personaSeed: number,
  ): Uint8ClampedArray {
    // silueta používa masku celej osoby, nie len box
    if (config.mode === 'silhouette' && mask) {
      const resized = resizeMask(mask, w, h);
      return silhouette(data, resized, w, h, personaColor(personaSeed));
    }

    const targets = faces.length === 0 ? [] : config.multiFace ? faces : [largest(faces)];
    let out = data;
    for (const face of targets) {
      out = this.effectInBox(out, w, h, face, config, personaSeed);
    }
    return out;
  }

  /** Aplikuje box-lokálny efekt (blur/pixelate/mask/avatar) na región tváre. */
  private effectInBox(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    face: FaceBox,
    config: AnonConfig,
    personaSeed: number,
  ): Uint8ClampedArray {
    // mierne rozšír box (vlasy, brada, uši — identita je aj okolo)
    const pad = 0.18;
    const fx = clampPx((face.x - face.width * pad) * w, 0, w);
    const fy = clampPx((face.y - face.height * pad) * h, 0, h);
    const fw = clampPx(face.width * (1 + 2 * pad) * w, 1, w - fx);
    const fh = clampPx(face.height * (1 + 2 * pad) * h, 1, h - fy);

    if (config.mode === 'mask' || config.mode === 'avatar') {
      this.drawOverlayBox(data, w, h, fx, fy, fw, fh, config.mode, personaSeed);
      return data;
    }

    // blur / pixelate: vystrihni región, sprocesuj, vlož späť
    const region = extractRegion(data, w, fx, fy, fw, fh);
    let processed: Uint8ClampedArray;
    if (config.mode === 'pixelate') {
      processed = pixelate(region, fw, fh, intensityToBlockSize(config.intensity));
    } else {
      processed = boxBlur(region, fw, fh, intensityToBlurRadius(config.intensity));
    }
    return insertRegion(data, w, processed, fx, fy, fw, fh);
  }

  /** Maska/avatar — nepriehľadná clona priamo do bufferu. */
  private drawOverlayBox(
    data: Uint8ClampedArray,
    w: number,
    _h: number,
    fx: number,
    fy: number,
    fw: number,
    fh: number,
    mode: 'mask' | 'avatar',
    personaSeed: number,
  ): void {
    const color = mode === 'avatar' ? personaColor(personaSeed) : { r: 20, g: 20, b: 24 };
    for (let y = fy; y < fy + fh; y++) {
      for (let x = fx; x < fx + fw; x++) {
        // mäkký oválny okraj, aby clona nevyzerala ako lepená nálepka
        const nx = (x - (fx + fw / 2)) / (fw / 2);
        const ny = (y - (fy + fh / 2)) / (fh / 2);
        if (nx * nx + ny * ny > 1.1) continue;
        const i = (y * w + x) * 4;
        data[i] = color.r;
        data[i + 1] = color.g;
        data[i + 2] = color.b;
        data[i + 3] = 255;
      }
    }
  }
}

function must<T>(v: T | null): T {
  if (v == null) throw new Error('ZÁVOJ: canvas 2D kontext nedostupný');
  return v;
}

function largest(faces: FaceBox[]): FaceBox {
  return faces.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
}

function clampPx(v: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, v)));
}

function extractRegion(
  data: Uint8ClampedArray,
  w: number,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(fw * fh * 4);
  for (let y = 0; y < fh; y++) {
    const srcStart = ((fy + y) * w + fx) * 4;
    out.set(data.subarray(srcStart, srcStart + fw * 4), y * fw * 4);
  }
  return out;
}

function insertRegion(
  data: Uint8ClampedArray,
  w: number,
  region: Uint8ClampedArray,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
): Uint8ClampedArray {
  for (let y = 0; y < fh; y++) {
    const dstStart = ((fy + y) * w + fx) * 4;
    data.set(region.subarray(y * fw * 4, (y + 1) * fw * 4), dstStart);
  }
  return data;
}

/** Najbližšie-sused resize masky na cieľové rozlíšenie frameu. */
function resizeMask(
  mask: { mask: ArrayLike<number>; width: number; height: number },
  w: number,
  h: number,
): Float32Array {
  const out = new Float32Array(w * h);
  const sx = mask.width / w;
  const sy = mask.height / h;
  for (let y = 0; y < h; y++) {
    const my = Math.min(mask.height - 1, Math.floor(y * sy));
    for (let x = 0; x < w; x++) {
      const mx = Math.min(mask.width - 1, Math.floor(x * sx));
      out[y * w + x] = mask.mask[my * mask.width + mx];
    }
  }
  return out;
}
