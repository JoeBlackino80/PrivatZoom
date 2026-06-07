import { describe, it, expect } from 'vitest';
import { ageOn, isOfAge, AgeGate, MemoryStore } from '../src/ageGate.js';

const NOW = new Date('2026-06-07T12:00:00Z');

describe('ageOn', () => {
  it('počíta celé roky', () => {
    expect(ageOn(new Date('2000-06-07'), NOW)).toBe(26);
  });
  it('deň pred narodeninami ešte neráta rok', () => {
    expect(ageOn(new Date('2008-06-08'), NOW)).toBe(17);
    expect(ageOn(new Date('2008-06-07'), NOW)).toBe(18);
  });
});

describe('isOfAge', () => {
  it('presne 18 prejde pri min 18', () => {
    expect(isOfAge(new Date('2008-06-07'), 18, NOW)).toBe(true);
  });
  it('o deň mladší neprejde', () => {
    expect(isOfAge(new Date('2008-06-08'), 18, NOW)).toBe(false);
  });
  it('dátum v budúcnosti neprejde', () => {
    expect(isOfAge(new Date('2030-01-01'), 18, NOW)).toBe(false);
  });
  it('neplatný dátum neprejde', () => {
    expect(isOfAge(new Date('nezmysel'), 18, NOW)).toBe(false);
  });
});

describe('AgeGate', () => {
  it('na začiatku nie je splnená', () => {
    const gate = new AgeGate(18, new MemoryStore());
    expect(gate.isPassed()).toBe(false);
  });

  it('potvrdenie dospelého dátumu prejde a perzistuje', () => {
    const store = new MemoryStore();
    const gate = new AgeGate(18, store);
    const res = gate.confirm(new Date('1990-01-01'), NOW);
    expect(res.passed).toBe(true);
    // nový gate nad tým istým store vidí potvrdenie
    expect(new AgeGate(18, store).isPassed()).toBe(true);
  });

  it('mladistvý dátum je odmietnutý s dôvodom', () => {
    const gate = new AgeGate(18, new MemoryStore());
    const res = gate.confirm(new Date('2015-01-01'), NOW);
    expect(res.passed).toBe(false);
    expect(res.reason).toMatch(/18/);
    expect(gate.isPassed()).toBe(false);
  });

  it('zvýšenie minAge si vyžiada re-potvrdenie', () => {
    const store = new MemoryStore();
    new AgeGate(16, store).confirm(new Date('2009-01-01'), NOW); // 17 r. → prejde pri 16
    expect(new AgeGate(16, store).isPassed()).toBe(true);
    expect(new AgeGate(18, store).isPassed()).toBe(false); // prísnejšia brána
  });

  it('reset zruší potvrdenie', () => {
    const gate = new AgeGate(18, new MemoryStore());
    gate.confirm(new Date('1990-01-01'), NOW);
    gate.reset();
    expect(gate.isPassed()).toBe(false);
  });
});
