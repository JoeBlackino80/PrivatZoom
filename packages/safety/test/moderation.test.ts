import { describe, it, expect } from 'vitest';
import { Moderation } from '../src/moderation.js';

describe('Moderation — block', () => {
  it('blokovanie je okamžité', () => {
    const m = new Moderation();
    expect(m.isBlocked('x')).toBe(false);
    m.block('x');
    expect(m.isBlocked('x')).toBe(true);
    expect(m.blockedList()).toEqual(['x']);
  });

  it('unblock funguje', () => {
    const m = new Moderation();
    m.block('x');
    m.unblock('x');
    expect(m.isBlocked('x')).toBe(false);
  });
});

describe('Moderation — report', () => {
  it('prijme platný report', () => {
    const m = new Moderation();
    const res = m.report('alice', 'bob', 'harassment', 'spamoval', 1000);
    expect(res.accepted).toBe(true);
    expect(m.reportsAgainst('bob')).toHaveLength(1);
    expect(m.reportsAgainst('bob')[0].note).toBe('spamoval');
  });

  it('odmietne report na seba', () => {
    const m = new Moderation();
    const res = m.report('alice', 'alice', 'spam', undefined, 1000);
    expect(res.accepted).toBe(false);
    expect(m.reportCount).toBe(0);
  });

  it('rate-limituje opakované reporty v okne', () => {
    const m = new Moderation({ maxPerWindow: 2, windowMs: 1000 });
    expect(m.report('a', 'b', 'spam', undefined, 0).accepted).toBe(true);
    expect(m.report('a', 'b', 'spam', undefined, 100).accepted).toBe(true);
    const third = m.report('a', 'b', 'spam', undefined, 200);
    expect(third.accepted).toBe(false);
    expect(third.reason).toMatch(/veľa/);
  });

  it('po vypršaní okna sa report opäť prijme', () => {
    const m = new Moderation({ maxPerWindow: 1, windowMs: 1000 });
    expect(m.report('a', 'b', 'spam', undefined, 0).accepted).toBe(true);
    expect(m.report('a', 'b', 'spam', undefined, 500).accepted).toBe(false);
    expect(m.report('a', 'b', 'spam', undefined, 1500).accepted).toBe(true);
  });

  it('rate-limit je per (reportér, subjekt)', () => {
    const m = new Moderation({ maxPerWindow: 1, windowMs: 1000 });
    expect(m.report('a', 'b', 'spam', undefined, 0).accepted).toBe(true);
    // iný subjekt → nová kvóta
    expect(m.report('a', 'c', 'spam', undefined, 0).accepted).toBe(true);
    // iný reportér → nová kvóta
    expect(m.report('z', 'b', 'spam', undefined, 0).accepted).toBe(true);
  });
});
