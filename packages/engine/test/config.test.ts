import { describe, it, expect } from 'vitest';
import {
  clamp,
  normalizeConfig,
  intensityToBlockSize,
  intensityToBlurRadius,
} from '../src/core/config.js';
import { DEFAULT_CONFIG } from '../src/types.js';

describe('clamp', () => {
  it('oreže pod aj nad rozsah', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
  it('NaN spadne na minimum', () => {
    expect(clamp(NaN, 0, 1)).toBe(0);
  });
});

describe('normalizeConfig', () => {
  it('undefined → default', () => {
    expect(normalizeConfig(undefined)).toEqual(DEFAULT_CONFIG);
  });
  it('oreže intensity do 0..1', () => {
    expect(normalizeConfig({ intensity: 5 }).intensity).toBe(1);
    expect(normalizeConfig({ intensity: -3 }).intensity).toBe(0);
  });
  it('neznámy mode spadne na default (nikdy neanonymizovaný stav)', () => {
    // @ts-expect-error úmyselne neplatný mode
    expect(normalizeConfig({ mode: 'hacker' }).mode).toBe(DEFAULT_CONFIG.mode);
  });
  it('neznámy scrub spadne na default', () => {
    // @ts-expect-error úmyselne neplatný scrub
    expect(normalizeConfig({ scrubBackground: 'xx' }).scrubBackground).toBe(
      DEFAULT_CONFIG.scrubBackground,
    );
  });
  it('zachová platné hodnoty', () => {
    const cfg = normalizeConfig({
      mode: 'silhouette',
      intensity: 0.3,
      scrubBackground: 'replace',
      failSafe: false,
      multiFace: false,
    });
    expect(cfg).toEqual({
      mode: 'silhouette',
      intensity: 0.3,
      scrubBackground: 'replace',
      failSafe: false,
      multiFace: false,
    });
  });
});

describe('intensity mapovania', () => {
  it('blockSize monotónne rastie', () => {
    expect(intensityToBlockSize(0)).toBeLessThan(intensityToBlockSize(0.5));
    expect(intensityToBlockSize(0.5)).toBeLessThan(intensityToBlockSize(1));
  });
  it('blurRadius monotónne rastie a je >= 0', () => {
    expect(intensityToBlurRadius(0)).toBeGreaterThanOrEqual(0);
    expect(intensityToBlurRadius(0)).toBeLessThan(intensityToBlurRadius(1));
  });
});
