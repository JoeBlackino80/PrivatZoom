import { describe, it, expect } from 'vitest';
import {
  pixelate,
  boxBlur,
  silhouette,
  compositeByMask,
  blurBoxes,
  fill,
} from '../src/core/pixels.js';

/** Pomocník: vytvor RGBA buffer z poľa [r,g,b] trojíc, alfa = 255. */
function rgba(pixels: number[][]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], p) => {
    out[p * 4] = r;
    out[p * 4 + 1] = g;
    out[p * 4 + 2] = b;
    out[p * 4 + 3] = 255;
  });
  return out;
}

describe('pixelate', () => {
  it('spriemeruje 2x2 blok na jednu farbu', () => {
    // 2x2 obraz, štyri rôzne hodnoty kanálu R: 0, 100, 200, 100 → priemer 100
    const src = rgba([
      [0, 0, 0],
      [100, 0, 0],
      [200, 0, 0],
      [100, 0, 0],
    ]);
    const out = pixelate(src, 2, 2, 2);
    for (let p = 0; p < 4; p++) {
      expect(out[p * 4]).toBe(100);
    }
  });

  it('nemutuje vstupný buffer', () => {
    const src = rgba([[10, 20, 30], [40, 50, 60], [70, 80, 90], [100, 110, 120]]);
    const copy = src.slice();
    pixelate(src, 2, 2, 2);
    expect(Array.from(src)).toEqual(Array.from(copy));
  });

  it('blockSize 1 zachová obraz', () => {
    const src = rgba([[10, 20, 30], [40, 50, 60], [70, 80, 90], [100, 110, 120]]);
    const out = pixelate(src, 2, 2, 1);
    expect(Array.from(out)).toEqual(Array.from(src));
  });
});

describe('boxBlur', () => {
  it('radius 0 vráti kópiu, nie ten istý buffer', () => {
    const src = rgba([[10, 0, 0], [250, 0, 0]]);
    const out = boxBlur(src, 2, 1, 0);
    expect(out).not.toBe(src);
    expect(Array.from(out)).toEqual(Array.from(src));
  });

  it('rozmaže hranu (priemeruje susedov)', () => {
    // 3x1: 0, 240, 0  → s radius 1 a clamp okrajov stred = (0+240+0)/3 = 80
    const src = rgba([[0, 0, 0], [240, 0, 0], [0, 0, 0]]);
    const out = boxBlur(src, 3, 1, 1);
    expect(out[4]).toBe(80); // stredný pixel, kanál R
  });

  it('uniformný obraz ostane uniformný (RGB 120, alfa 255)', () => {
    const src = rgba([[120, 120, 120], [120, 120, 120], [120, 120, 120], [120, 120, 120]]);
    const out = boxBlur(src, 2, 2, 1);
    for (let i = 0; i < out.length; i++) {
      expect(out[i]).toBe(i % 4 === 3 ? 255 : 120);
    }
  });
});

describe('silhouette', () => {
  it('nahradí popredie plnou farbou, pozadie nechá', () => {
    const src = rgba([[10, 10, 10], [20, 20, 20]]);
    const mask = [1, 0]; // prvý pixel popredie
    const out = silhouette(src, mask, 2, 1, { r: 0, g: 0, b: 255 });
    expect(Array.from(out.slice(0, 4))).toEqual([0, 0, 255, 255]);
    expect(Array.from(out.slice(4, 8))).toEqual([20, 20, 20, 255]);
  });

  it('akceptuje 0..255 masku', () => {
    const src = rgba([[10, 10, 10], [20, 20, 20]]);
    const mask = [255, 0];
    const out = silhouette(src, mask, 2, 1, { r: 1, g: 2, b: 3 });
    expect(Array.from(out.slice(0, 3))).toEqual([1, 2, 3]);
  });
});

describe('compositeByMask', () => {
  it('mask=1 dá popredie, mask=0 dá pozadie', () => {
    const fg = rgba([[200, 0, 0], [200, 0, 0]]);
    const bg = rgba([[0, 0, 100], [0, 0, 100]]);
    const out = compositeByMask(fg, bg, [1, 0], 2, 1);
    expect(Array.from(out.slice(0, 3))).toEqual([200, 0, 0]);
    expect(Array.from(out.slice(4, 7))).toEqual([0, 0, 100]);
  });

  it('mask=0.5 zmieša napoly', () => {
    const fg = rgba([[200, 0, 0]]);
    const bg = rgba([[0, 0, 0]]);
    const out = compositeByMask(fg, bg, [0.5], 1, 1);
    expect(out[0]).toBe(100);
  });
});

describe('blurBoxes (scrub scény)', () => {
  it('rozmaže len pixely vnútri boxu, zvyšok nechá', () => {
    // 4x1 obraz: [0,240,0,240]; box pokrýva pravú polovicu (x=0.5,w=0.5)
    const src = rgba([[0, 0, 0], [240, 0, 0], [0, 0, 0], [240, 0, 0]]);
    const out = blurBoxes(src, 4, 1, [{ x: 0.5, y: 0, width: 0.5, height: 1 }], 1);
    // ľavá polovica nezmenená
    expect(out[0]).toBe(0);
    expect(out[4]).toBe(240);
    // pravá polovica rozmazaná (priemerovaná) → medzi 0 a 240
    expect(out[8]).toBeGreaterThan(0);
    expect(out[8]).toBeLessThan(240);
  });

  it('prázdny zoznam boxov nechá obraz nezmenený', () => {
    const src = rgba([[10, 20, 30], [40, 50, 60]]);
    const out = blurBoxes(src, 2, 1, [], 2);
    expect(Array.from(out)).toEqual(Array.from(src));
  });

  it('box mimo plátna sa bezpečne oreže (žiadny pád)', () => {
    const src = rgba([[10, 0, 0], [20, 0, 0]]);
    const out = blurBoxes(src, 2, 1, [{ x: 0.9, y: 0, width: 0.5, height: 1 }], 1);
    expect(out.length).toBe(src.length);
  });

  it('nemutuje vstupný buffer', () => {
    const src = rgba([[0, 0, 0], [240, 0, 0]]);
    const copy = src.slice();
    blurBoxes(src, 2, 1, [{ x: 0, y: 0, width: 1, height: 1 }], 1);
    expect(Array.from(src)).toEqual(Array.from(copy));
  });
});

describe('fill', () => {
  it('vyplní celý buffer farbou a alfou 255', () => {
    const out = fill(2, 2, { r: 5, g: 6, b: 7 });
    expect(out.length).toBe(16);
    for (let p = 0; p < 4; p++) {
      expect(Array.from(out.slice(p * 4, p * 4 + 4))).toEqual([5, 6, 7, 255]);
    }
  });
});
