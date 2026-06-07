/**
 * Vekové brány. Anonymita priťahuje zneužitie → vstup za vekovú hranicu je
 * podmienka pre store review aj pre B2B (telemedicína, terapia).
 *
 * Pure logika + tenké úložisko (Storage-like), aby bola testovateľná bez DOM
 * a portovateľná. Web použije localStorage adapter, Flutter shared_preferences.
 */

/** Minimálne perzistentné úložisko (podmnožina Web Storage API). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Pamäťový store — default pre testy a prostredia bez perzistencie. */
export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** Vek v celých rokoch k dátumu `now` (kalendárne presné, vrátane prestupných). */
export function ageOn(birth: Date, now: Date): number {
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/** Splní dátum narodenia minimálny vek k `now`? */
export function isOfAge(birth: Date, minAge: number, now: Date = new Date()): boolean {
  if (Number.isNaN(birth.getTime())) return false;
  if (birth.getTime() > now.getTime()) return false; // dátum v budúcnosti
  return ageOn(birth, now) >= minAge;
}

export interface AgeAttestation {
  /** Kedy používateľ potvrdil vek (ms epoch). */
  confirmedAt: number;
  /** Minimálny vek, voči ktorému bol potvrdený. */
  minAge: number;
}

const STORAGE_KEY = 'zavoj.age.attestation';

/**
 * Veková brána s perzistentným potvrdením. Self-attestation cez dátum
 * narodenia (žiadne ID, žiadne biometrické dáta — data minimization).
 * Re-potvrdenie sa vyžiada, ak sa zvýši minimálny vek.
 */
export class AgeGate {
  constructor(
    private readonly minAge: number,
    private readonly store: KeyValueStore = new MemoryStore(),
  ) {}

  /** Je brána splnená (platné uložené potvrdenie pre aktuálny minAge)? */
  isPassed(): boolean {
    const att = this.read();
    return att !== null && att.minAge >= this.minAge;
  }

  /**
   * Potvrď vek dátumom narodenia. Pri úspechu uloží potvrdenie.
   * Vracia výsledok aj dôvod prípadného zamietnutia.
   */
  confirm(birth: Date, now: Date = new Date()): { passed: boolean; reason?: string } {
    if (Number.isNaN(birth.getTime())) {
      return { passed: false, reason: 'neplatný dátum' };
    }
    if (!isOfAge(birth, this.minAge, now)) {
      return { passed: false, reason: `vyžaduje sa min. ${this.minAge} rokov` };
    }
    const att: AgeAttestation = { confirmedAt: now.getTime(), minAge: this.minAge };
    this.store.setItem(STORAGE_KEY, JSON.stringify(att));
    return { passed: true };
  }

  /** Zruší uložené potvrdenie (napr. odhlásenie). */
  reset(): void {
    this.store.removeItem(STORAGE_KEY);
  }

  private read(): AgeAttestation | null {
    const raw = this.store.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AgeAttestation;
      if (typeof parsed.confirmedAt === 'number' && typeof parsed.minAge === 'number') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
}
