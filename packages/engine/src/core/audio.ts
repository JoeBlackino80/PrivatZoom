/**
 * Pure audio helpery pre anonymizáciu hlasu.
 *
 * Cieľ: zmeniť identitu hlasu (výška + formanty), ale NIE robotický efekt.
 * Persona je deterministická — rovnaký seed → rovnaký hlas pri každom hovore.
 * Skutočný DSP graf je v runtime/voiceAnonymizer.ts (Web Audio); tu je len
 * deterministická matematika, ktorá sa dá testovať a portovať.
 */
import { VoiceProfile } from '../types.js';

/** Prevod poltónov na frekvenčný pomer: 12 poltónov = oktáva = 2×. */
export function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/** Prevod centov na pomer (100 centov = 1 poltón). */
export function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}

/**
 * Deterministický hash reťazca (FNV-1a, 32-bit). Stabilný naprieč platformami
 * → rovnaká persona na webe aj na mobile.
 */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Vygeneruje deterministický, ľudsky znejúci hlasový profil zo seedu.
 *
 * Posuny držíme v rozsahu, ktorý mení identitu, ale neznie ako stroj:
 *  - pitch: -5..+5 poltónov
 *  - formant: 0.8..1.25 (tvar hlasového traktu)
 *  - detune: -25..+25 centov (jemný konzistentný charakter)
 */
export function personaProfile(seed: string): VoiceProfile {
  const h = hashSeed(seed);
  // tri nezávislé pseudonáhodné kanály z jedného hashu
  const a = (h & 0x3ff) / 0x3ff; // 10 bitov
  const b = ((h >>> 10) & 0x3ff) / 0x3ff;
  const c = ((h >>> 20) & 0x3ff) / 0x3ff;

  const pitchSemitones = Math.round((a * 10 - 5) * 10) / 10; // -5..+5
  const formantRatio = Math.round((0.8 + b * 0.45) * 100) / 100; // 0.8..1.25
  const detuneCents = Math.round(c * 50 - 25); // -25..+25

  return { pitchSemitones, formantRatio, detuneCents };
}

/**
 * Celkový frekvenčný pomer aplikovaný na výšku (pitch + detune).
 * Použiteľné na rýchlu kontrolu a ako parameter pre time-pitch uzol.
 */
export function effectivePitchRatio(profile: VoiceProfile): number {
  return semitonesToRatio(profile.pitchSemitones) * centsToRatio(profile.detuneCents);
}
