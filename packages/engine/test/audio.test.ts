import { describe, it, expect } from 'vitest';
import {
  semitonesToRatio,
  centsToRatio,
  hashSeed,
  personaProfile,
  effectivePitchRatio,
} from '../src/core/audio.js';

describe('semitonesToRatio', () => {
  it('0 poltónov = pomer 1', () => {
    expect(semitonesToRatio(0)).toBeCloseTo(1, 10);
  });
  it('12 poltónov = oktáva = 2', () => {
    expect(semitonesToRatio(12)).toBeCloseTo(2, 10);
  });
  it('-12 poltónov = pol = 0.5', () => {
    expect(semitonesToRatio(-12)).toBeCloseTo(0.5, 10);
  });
});

describe('centsToRatio', () => {
  it('100 centov = 1 poltón', () => {
    expect(centsToRatio(100)).toBeCloseTo(semitonesToRatio(1), 10);
  });
});

describe('hashSeed', () => {
  it('je deterministický', () => {
    expect(hashSeed('zavoj')).toBe(hashSeed('zavoj'));
  });
  it('rôzne vstupy → rôzne hashe', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
  it('vracia unsigned 32-bit', () => {
    const h = hashSeed('whatever-long-seed-123');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('personaProfile', () => {
  it('rovnaký seed → rovnaký profil (konzistentná persona)', () => {
    expect(personaProfile('alice')).toEqual(personaProfile('alice'));
  });

  it('drží sa ľudských rozsahov', () => {
    for (const seed of ['a', 'bob', 'persona-42', 'xÿz', 'zdroj']) {
      const p = personaProfile(seed);
      expect(p.pitchSemitones).toBeGreaterThanOrEqual(-5);
      expect(p.pitchSemitones).toBeLessThanOrEqual(5);
      expect(p.formantRatio).toBeGreaterThanOrEqual(0.8);
      expect(p.formantRatio).toBeLessThanOrEqual(1.25);
      expect(p.detuneCents).toBeGreaterThanOrEqual(-25);
      expect(p.detuneCents).toBeLessThanOrEqual(25);
    }
  });

  it('rôzne persony sa líšia (aspoň niektoré seedy)', () => {
    const a = personaProfile('alice');
    const b = personaProfile('zorro');
    expect(a).not.toEqual(b);
  });
});

describe('effectivePitchRatio', () => {
  it('kombinuje pitch a detune', () => {
    const ratio = effectivePitchRatio({
      pitchSemitones: 12,
      formantRatio: 1,
      detuneCents: 0,
    });
    expect(ratio).toBeCloseTo(2, 6);
  });
});
