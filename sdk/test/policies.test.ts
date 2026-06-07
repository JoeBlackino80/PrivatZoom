import { describe, it, expect } from 'vitest';
import { resolveConfig, type SdkPolicy } from '../src/policies.js';

describe('resolveConfig', () => {
  it('force-on vynúti failSafe true a zamknuté polia', () => {
    const policy: SdkPolicy = {
      mode: 'force-on',
      baseConfig: { mode: 'pixelate', failSafe: true },
      locked: ['mode'],
    };
    const out = resolveConfig(policy, { mode: 'blur', failSafe: false });
    expect(out.mode).toBe('pixelate'); // zamknuté integrátorom
    expect(out.failSafe).toBe(true); // force-on vynúti
  });

  it('user-choice ponechá používateľské zmeny mimo locked', () => {
    const policy: SdkPolicy = {
      mode: 'user-choice',
      baseConfig: { mode: 'pixelate' },
    };
    const out = resolveConfig(policy, { mode: 'avatar', intensity: 0.9 });
    expect(out.mode).toBe('avatar');
    expect(out.intensity).toBe(0.9);
  });

  it('force-off vráti len baseConfig (ignoruje používateľa)', () => {
    const policy: SdkPolicy = {
      mode: 'force-off',
      baseConfig: { mode: 'blur' },
    };
    const out = resolveConfig(policy, { mode: 'avatar' });
    expect(out).toEqual({ mode: 'blur' });
  });
});
