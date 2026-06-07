import { describe, it, expect } from 'vitest';
import { canUseMode, gateConfig, features } from '../src/billing.js';

describe('plan features', () => {
  it('free má len blur + vodoznak', () => {
    const f = features('free');
    expect(f.modes).toEqual(['blur']);
    expect(f.watermark).toBe(true);
    expect(f.voice).toBe(false);
  });
  it('pro má všetky režimy bez vodoznaku', () => {
    const f = features('pro');
    expect(f.modes).toContain('avatar');
    expect(f.watermark).toBe(false);
    expect(f.personas).toBe(true);
  });
});

describe('canUseMode', () => {
  it('free nesmie avatar', () => {
    expect(canUseMode('free', 'avatar')).toBe(false);
    expect(canUseMode('free', 'blur')).toBe(true);
  });
  it('pro smie všetko', () => {
    expect(canUseMode('pro', 'silhouette')).toBe(true);
  });
});

describe('gateConfig', () => {
  it('free zoslabí nepovolený režim na blur a zapne vodoznak', () => {
    const { config, watermark } = gateConfig('free', { mode: 'avatar', sceneScrub: true, scrubBackground: 'blur' });
    expect(config.mode).toBe('blur');
    expect(config.sceneScrub).toBe(false);
    expect(config.scrubBackground).toBe('off');
    expect(watermark).toBe(true);
  });

  it('pro ponechá voľby a bez vodoznaku', () => {
    const { config, watermark } = gateConfig('pro', { mode: 'avatar', sceneScrub: true, scrubBackground: 'replace' });
    expect(config.mode).toBe('avatar');
    expect(config.sceneScrub).toBe(true);
    expect(config.scrubBackground).toBe('replace');
    expect(watermark).toBe(false);
  });

  it('clona ostane zapnutá aj pri nedovolenej voľbe (nikdy nie vypnutá)', () => {
    const { config } = gateConfig('free', {});
    expect(config.mode).toBe('blur'); // vždy aspoň blur
  });
});
