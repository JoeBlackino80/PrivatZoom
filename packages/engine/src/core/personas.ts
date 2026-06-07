/**
 * Persony a per-kontakt nastavenie.
 *
 * Persona = pomenovaný profil clony (seed → stabilná silueta/avatar/hlas) +
 * preferovaná konfigurácia. Používateľ má viacero person pre rôzne kontexty a
 * môže každému kontaktu priradiť konkrétnu personu (alebo „vždy reálny voči X”).
 *
 * Čistá, deterministická logika — testovateľná a portovateľná (web/Flutter/SDK).
 */
import { AnonConfig } from '../types.js';
import { VoiceProfile } from '../types.js';
import { personaProfile } from './audio.js';

export interface Persona {
  /** Stabilný identifikátor persony. */
  id: string;
  /** Zobrazovaný názov (napr. „Práca”, „Anonym”, „Zdroj”). */
  label: string;
  /** Seed → deterministická silueta/avatar farba a hlasový profil. */
  seed: string;
  /** Preferovaná konfigurácia clony pre túto personu. */
  config: Partial<AnonConfig>;
}

/** Špeciálna persona: voči tomuto kontaktu si vždy reálny (žiadna clona). */
export const REAL_PERSONA_ID = '__real__';

/**
 * Kniha person + mapovanie kontaktov. Vždy existuje aspoň jedna persona a
 * default, takže `resolve` nikdy nevráti undefined — engine sa nesmie ocitnúť
 * bez profilu.
 */
export class PersonaBook {
  private personas = new Map<string, Persona>();
  private contacts = new Map<string, string>(); // contactId → personaId
  private defaultId: string;

  constructor(initial: Persona[]) {
    if (initial.length === 0) {
      throw new Error('ZÁVOJ: PersonaBook vyžaduje aspoň jednu personu.');
    }
    for (const p of initial) this.personas.set(p.id, p);
    this.defaultId = initial[0].id;
  }

  list(): Persona[] {
    return [...this.personas.values()];
  }

  get(id: string): Persona | undefined {
    return this.personas.get(id);
  }

  add(persona: Persona): void {
    this.personas.set(persona.id, persona);
  }

  /** Odstráni personu. Default ani priradenia na ňu sa nesmú stratiť potichu. */
  remove(id: string): void {
    if (id === this.defaultId) {
      throw new Error('ZÁVOJ: nemožno odstrániť default personu (najprv zmeň default).');
    }
    this.personas.delete(id);
    // kontakty priradené na odstránenú personu spadnú na default
    for (const [contact, personaId] of this.contacts) {
      if (personaId === id) this.contacts.delete(contact);
    }
  }

  setDefault(id: string): void {
    if (!this.personas.has(id)) {
      throw new Error(`ZÁVOJ: neznáma persona "${id}".`);
    }
    this.defaultId = id;
  }

  getDefault(): Persona {
    return this.personas.get(this.defaultId) as Persona;
  }

  /** Priradí kontaktu personu (alebo REAL_PERSONA_ID = vždy reálny voči nemu). */
  assign(contactId: string, personaId: string): void {
    if (personaId !== REAL_PERSONA_ID && !this.personas.has(personaId)) {
      throw new Error(`ZÁVOJ: neznáma persona "${personaId}".`);
    }
    this.contacts.set(contactId, personaId);
  }

  unassign(contactId: string): void {
    this.contacts.delete(contactId);
  }

  /** Je voči kontaktu nastavený „vždy reálny” režim? */
  isRealFor(contactId: string): boolean {
    return this.contacts.get(contactId) === REAL_PERSONA_ID;
  }

  /**
   * Vyrieši personu pre kontakt: priradená persona, inak default.
   * Pri „vždy reálny voči X” vráti default personu, ale `isRealFor` je true —
   * volajúci podľa toho zapne reveal/žiadnu clonu.
   */
  resolve(contactId?: string): Persona {
    if (contactId) {
      const assigned = this.contacts.get(contactId);
      if (assigned && assigned !== REAL_PERSONA_ID) {
        const p = this.personas.get(assigned);
        if (p) return p;
      }
    }
    return this.getDefault();
  }

  /** Deterministický hlasový profil pre personu daného kontaktu. */
  voiceFor(contactId?: string): VoiceProfile {
    return personaProfile(this.resolve(contactId).seed);
  }
}
