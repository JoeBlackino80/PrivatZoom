import { describe, it, expect } from 'vitest';
import { PersonaBook, REAL_PERSONA_ID } from '../src/core/personas.js';
import { personaProfile } from '../src/core/audio.js';
import type { Persona } from '../src/core/personas.js';

const anon: Persona = { id: 'anon', label: 'Anonym', seed: 'anon-1', config: { mode: 'pixelate' } };
const work: Persona = { id: 'work', label: 'Práca', seed: 'work-1', config: { mode: 'avatar' } };

function book(): PersonaBook {
  return new PersonaBook([anon, work]);
}

describe('PersonaBook', () => {
  it('vyžaduje aspoň jednu personu', () => {
    expect(() => new PersonaBook([])).toThrow(/aspoň jednu/);
  });

  it('prvá persona je default', () => {
    expect(book().getDefault().id).toBe('anon');
  });

  it('resolve bez kontaktu vráti default', () => {
    expect(book().resolve().id).toBe('anon');
  });

  it('per-kontakt priradenie prebije default', () => {
    const b = book();
    b.assign('bob', 'work');
    expect(b.resolve('bob').id).toBe('work');
    expect(b.resolve('alice').id).toBe('anon'); // nepriradený → default
  });

  it('„vždy reálny voči X” — isRealFor true, resolve padne na default', () => {
    const b = book();
    b.assign('mama', REAL_PERSONA_ID);
    expect(b.isRealFor('mama')).toBe(true);
    expect(b.isRealFor('bob')).toBe(false);
    expect(b.resolve('mama').id).toBe('anon');
  });

  it('hlas je deterministický podľa seedu persony', () => {
    const b = book();
    b.assign('bob', 'work');
    expect(b.voiceFor('bob')).toEqual(personaProfile('work-1'));
    expect(b.voiceFor()).toEqual(personaProfile('anon-1'));
  });

  it('odstránenie persony presunie jej kontakty na default', () => {
    const b = book();
    b.assign('bob', 'work');
    b.remove('work');
    expect(b.get('work')).toBeUndefined();
    expect(b.resolve('bob').id).toBe('anon');
  });

  it('default personu nemožno odstrániť', () => {
    expect(() => book().remove('anon')).toThrow(/default/);
  });

  it('priradenie neznámej persony zlyhá', () => {
    expect(() => book().assign('bob', 'ghost')).toThrow(/neznáma/);
  });

  it('zmena defaultu sa prejaví v resolve', () => {
    const b = book();
    b.setDefault('work');
    expect(b.resolve().id).toBe('work');
  });

  it('add pridá novú personu dostupnú na priradenie', () => {
    const b = book();
    b.add({ id: 'date', label: 'Zoznamka', seed: 'date-1', config: { mode: 'silhouette' } });
    b.assign('match', 'date');
    expect(b.resolve('match').config.mode).toBe('silhouette');
  });
});
