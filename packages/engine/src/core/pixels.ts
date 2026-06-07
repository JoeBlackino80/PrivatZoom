/**
 * Pure pixel operácie nad RGBA bufferom (Uint8ClampedArray, 4 byty/px).
 *
 * Toto je zámerne čistá CPU implementácia: slúži ako (a) deterministicky
 * testovateľné jadro a (b) fallback, keď WebGL/Metal nie je dostupný.
 * Produkčná rýchla cesta sú GPU shadery v runtime/, ktoré počítajú to isté.
 */

import { RGB, Rect } from '../types.js';
export type { RGB };

/** Index do RGBA bufferu pre pixel (x, y). */
function idx(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

/**
 * Pixelizácia: každý blok blockSize×blockSize sa nahradí svojou priemernou
 * farbou. Vracia NOVÝ buffer (vstup nemutuje). blockSize >= 1.
 */
export function pixelate(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  blockSize: number,
): Uint8ClampedArray {
  const block = Math.max(1, Math.floor(blockSize));
  const out = new Uint8ClampedArray(src.length);

  for (let by = 0; by < height; by += block) {
    for (let bx = 0; bx < width; bx += block) {
      const xEnd = Math.min(bx + block, width);
      const yEnd = Math.min(by + block, height);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;

      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = idx(x, y, width);
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          a += src[i + 3];
          count++;
        }
      }

      const ar = r / count;
      const ag = g / count;
      const ab = b / count;
      const aa = a / count;

      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = idx(x, y, width);
          out[i] = ar;
          out[i + 1] = ag;
          out[i + 2] = ab;
          out[i + 3] = aa;
        }
      }
    }
  }

  return out;
}

/**
 * Separabilný box-blur s polomerom radius (px). Dve priechody (horizontálny
 * + vertikálny) → O(n) na pixel nezávisle od polomeru. Vracia nový buffer.
 */
export function boxBlur(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): Uint8ClampedArray {
  const r = Math.max(0, Math.floor(radius));
  if (r === 0) return src.slice();

  const horiz = blurPass(src, width, height, r, true);
  return blurPass(horiz, width, height, r, false);
}

function blurPass(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const lineLen = horizontal ? width : height;
  const crossLen = horizontal ? height : width;
  const window = radius * 2 + 1;

  for (let c = 0; c < crossLen; c++) {
    for (let ch = 0; ch < 4; ch++) {
      let sum = 0;
      // inicializuj okno na začiatku riadku (clamp na okraje)
      for (let k = -radius; k <= radius; k++) {
        const p = clampIndex(k, lineLen);
        sum += sample(src, horizontal, p, c, width, ch);
      }
      for (let l = 0; l < lineLen; l++) {
        setSample(out, horizontal, l, c, width, ch, sum / window);
        const outgoing = clampIndex(l - radius, lineLen);
        const incoming = clampIndex(l + radius + 1, lineLen);
        sum -= sample(src, horizontal, outgoing, c, width, ch);
        sum += sample(src, horizontal, incoming, c, width, ch);
      }
    }
  }

  return out;
}

function clampIndex(i: number, len: number): number {
  if (i < 0) return 0;
  if (i >= len) return len - 1;
  return i;
}

function sample(
  buf: Uint8ClampedArray,
  horizontal: boolean,
  l: number,
  c: number,
  width: number,
  ch: number,
): number {
  const x = horizontal ? l : c;
  const y = horizontal ? c : l;
  return buf[(y * width + x) * 4 + ch];
}

function setSample(
  buf: Uint8ClampedArray,
  horizontal: boolean,
  l: number,
  c: number,
  width: number,
  ch: number,
  value: number,
): void {
  const x = horizontal ? l : c;
  const y = horizontal ? c : l;
  buf[(y * width + x) * 4 + ch] = value;
}

/**
 * Silueta: kde maska označuje popredie (osobu), pixel sa nahradí plnou
 * farbou; pozadie ostáva. mask je Uint8 (0..255) alebo Float (0..1) na pixel.
 * Vracia nový buffer.
 */
export function silhouette(
  src: Uint8ClampedArray,
  mask: ArrayLike<number>,
  width: number,
  height: number,
  color: RGB,
  threshold = 0.5,
): Uint8ClampedArray {
  const out = src.slice();
  const maskScale = inferMaskScale(mask);
  for (let p = 0; p < width * height; p++) {
    const m = mask[p] * maskScale;
    if (m >= threshold) {
      const i = p * 4;
      out[i] = color.r;
      out[i + 1] = color.g;
      out[i + 2] = color.b;
      out[i + 3] = 255;
    }
  }
  return out;
}

/**
 * Composit popredia a pozadia podľa masky (alfa blend).
 * out = mask * foreground + (1 - mask) * background.
 * Používa sa na scrub pozadia: foreground = originál, background = rozmazaný/náhrada.
 */
export function compositeByMask(
  foreground: Uint8ClampedArray,
  background: Uint8ClampedArray,
  mask: ArrayLike<number>,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(foreground.length);
  const maskScale = inferMaskScale(mask);
  for (let p = 0; p < width * height; p++) {
    const m = Math.min(1, Math.max(0, mask[p] * maskScale));
    const i = p * 4;
    for (let ch = 0; ch < 4; ch++) {
      out[i + ch] = m * foreground[i + ch] + (1 - m) * background[i + ch];
    }
  }
  return out;
}

/**
 * Rozmaže zadané normalizované obdĺžniky (0..1) — scrub scény: menovky,
 * dokumenty, obrazovky, ŠPZ, fotky v zábere. Boxy mimo plátna sa orežú,
 * prázdne/nulové sa preskočia. Vracia nový buffer.
 */
export function blurBoxes(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  boxes: Rect[],
  radius: number,
): Uint8ClampedArray {
  const out = src.slice();
  for (const box of boxes) {
    const fx = clampInt(box.x * width, 0, width);
    const fy = clampInt(box.y * height, 0, height);
    const fw = clampInt(box.width * width, 0, width - fx);
    const fh = clampInt(box.height * height, 0, height - fy);
    if (fw < 1 || fh < 1) continue;

    const region = extractRegion(out, width, fx, fy, fw, fh);
    const blurred = boxBlur(region, fw, fh, radius);
    insertRegion(out, width, blurred, fx, fy, fw, fh);
  }
  return out;
}

function clampInt(v: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, v)));
}

function extractRegion(
  data: Uint8ClampedArray,
  width: number,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(fw * fh * 4);
  for (let y = 0; y < fh; y++) {
    const srcStart = ((fy + y) * width + fx) * 4;
    out.set(data.subarray(srcStart, srcStart + fw * 4), y * fw * 4);
  }
  return out;
}

function insertRegion(
  data: Uint8ClampedArray,
  width: number,
  region: Uint8ClampedArray,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
): void {
  for (let y = 0; y < fh; y++) {
    const dstStart = ((fy + y) * width + fx) * 4;
    data.set(region.subarray(y * fw * 4, (y + 1) * fw * 4), dstStart);
  }
}

/** Vyplní celý buffer jednou farbou (fail-safe celoplošná clona). */
export function fill(
  width: number,
  height: number,
  color: RGB,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    out[i] = color.r;
    out[i + 1] = color.g;
    out[i + 2] = color.b;
    out[i + 3] = 255;
  }
  return out;
}

/**
 * Heuristika: ak max hodnota masky > 1, je to 0..255 → škáluj 1/255,
 * inak je už 0..1 → škála 1.
 */
function inferMaskScale(mask: ArrayLike<number>): number {
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 1) return 1 / 255;
  }
  return 1;
}
