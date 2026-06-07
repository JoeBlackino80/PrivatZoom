import { describe, it, expect } from 'vitest';
import { RecordingConsent } from '../src/consent.js';

describe('RecordingConsent', () => {
  it('default je idle a nahrávanie zakázané (efemérne)', () => {
    const c = new RecordingConsent();
    c.addParticipant('a');
    c.addParticipant('b');
    expect(c.state()).toBe('idle');
    expect(c.canRecord()).toBe(false);
  });

  it('po žiadosti bez súhlasu je pending', () => {
    const c = new RecordingConsent();
    c.addParticipant('a');
    c.addParticipant('b');
    c.request();
    expect(c.state()).toBe('pending');
    expect(c.canRecord()).toBe(false);
  });

  it('nahráva sa až keď súhlasia VŠETCI', () => {
    const c = new RecordingConsent();
    c.addParticipant('a');
    c.addParticipant('b');
    c.request();
    c.setConsent('a', true);
    expect(c.state()).toBe('pending'); // b ešte nie
    c.setConsent('b', true);
    expect(c.state()).toBe('recording');
    expect(c.canRecord()).toBe(true);
  });

  it('jediné odmietnutie zablokuje nahrávanie', () => {
    const c = new RecordingConsent();
    c.addParticipant('a');
    c.addParticipant('b');
    c.request();
    c.setConsent('a', true);
    c.setConsent('b', false);
    expect(c.state()).toBe('denied');
    expect(c.canRecord()).toBe(false);
  });

  it('nový účastník počas nahrávania ho pozastaví (musí súhlasiť)', () => {
    const c = new RecordingConsent();
    c.addParticipant('a');
    c.request();
    c.setConsent('a', true);
    expect(c.canRecord()).toBe(true);
    c.addParticipant('c'); // pridá sa ako pending
    expect(c.canRecord()).toBe(false);
    expect(c.state()).toBe('pending');
  });

  it('reset vráti do efemérneho stavu', () => {
    const c = new RecordingConsent();
    c.addParticipant('a');
    c.request();
    c.setConsent('a', true);
    c.reset();
    expect(c.state()).toBe('idle');
    expect(c.canRecord()).toBe(false);
  });

  it('bez účastníkov sa nedá nahrávať ani po žiadosti', () => {
    const c = new RecordingConsent();
    c.request();
    expect(c.canRecord()).toBe(false);
    expect(c.state()).toBe('pending');
  });
});
