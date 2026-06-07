import { describe, it, expect } from 'vitest';
import {
  ZAVOJ_INVENTORY,
  biometricEgress,
  isGdprMinimized,
  auditEgress,
  type DataInventoryEntry,
} from '../src/compliance.js';

describe('referenčný inventár', () => {
  it('je súladný s data minimization', () => {
    expect(isGdprMinimized(ZAVOJ_INVENTORY)).toBe(true);
    expect(biometricEgress(ZAVOJ_INVENTORY)).toHaveLength(0);
  });
});

describe('biometricEgress', () => {
  it('odhalí biometriu odoslanú na server', () => {
    const tampered: DataInventoryEntry[] = [
      ...ZAVOJ_INVENTORY,
      { category: 'face-geometry', location: 'server', retained: true, purpose: 'leak' },
    ];
    expect(biometricEgress(tampered)).toHaveLength(1);
    expect(isGdprMinimized(tampered)).toBe(false);
  });

  it('retencia biometrie na zariadení tiež porušuje minimalizáciu', () => {
    const retained: DataInventoryEntry[] = [
      { category: 'voice-print', location: 'on-device', retained: true, purpose: 'x' },
    ];
    expect(isGdprMinimized(retained)).toBe(false);
  });

  it('account-email/payment na serveri sú v poriadku (nie biometria)', () => {
    const ok: DataInventoryEntry[] = [
      { category: 'account-email', location: 'server', retained: true, purpose: 'účet' },
      { category: 'payment', location: 'server', retained: true, purpose: 'stripe' },
    ];
    expect(isGdprMinimized(ok)).toBe(true);
  });
});

describe('auditEgress', () => {
  it('0 bytov = súladné', () => {
    expect(auditEgress(0).compliant).toBe(true);
  });
  it('akýkoľvek odoslaný byte = porušenie invariantu', () => {
    const res = auditEgress(128);
    expect(res.compliant).toBe(false);
    expect(res.reason).toMatch(/128/);
  });
});
