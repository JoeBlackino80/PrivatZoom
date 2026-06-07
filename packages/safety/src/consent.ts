/**
 * Súhlas s nahrávaním. ZÁVOJ je efemérny defaultne — žiadne nahrávky.
 * Ak sa nahráva, musia s tým súhlasiť VŠETCI účastníci a vidieť indikátor.
 * Toto znižuje právne riziko a je požiadavka pre store aj B2B.
 */

export type ConsentState =
  /** Nikto nepožiadal o nahrávanie (default, efemérne). */
  | 'idle'
  /** Požiadané, čaká sa na súhlas aspoň jedného účastníka. */
  | 'pending'
  /** Všetci súhlasili — nahrávanie povolené, indikátor svieti. */
  | 'recording'
  /** Aspoň jeden účastník výslovne odmietol — nahrávanie zablokované. */
  | 'denied';

/** Trojstav súhlasu jedného účastníka. */
type Vote = 'pending' | 'yes' | 'no';

/**
 * Ledger súhlasov pre jeden hovor. Nahrávanie je povolené iba ak oň niekto
 * požiadal a každý prítomný účastník výslovne súhlasil (žiadne tiché áno).
 */
export class RecordingConsent {
  private votes = new Map<string, Vote>();
  private requested = false;

  addParticipant(id: string): void {
    if (!this.votes.has(id)) this.votes.set(id, 'pending');
  }

  removeParticipant(id: string): void {
    this.votes.delete(id);
  }

  /** Účastník (host alebo ktokoľvek) požiada o nahrávanie. */
  request(): void {
    this.requested = true;
  }

  /** Nastav súhlas/odmietnutie konkrétneho účastníka. */
  setConsent(id: string, consent: boolean): void {
    this.votes.set(id, consent ? 'yes' : 'no');
  }

  /** Nahrávanie povolené len pri žiadosti + aspoň 1 účastník + súhlas všetkých. */
  canRecord(): boolean {
    if (!this.requested || this.votes.size === 0) return false;
    for (const v of this.votes.values()) {
      if (v !== 'yes') return false;
    }
    return true;
  }

  /** Súhrnný stav pre indikátor v UI. */
  state(): ConsentState {
    if (!this.requested) return 'idle';
    if (this.votes.size === 0) return 'pending';
    let allYes = true;
    for (const v of this.votes.values()) {
      if (v === 'no') return 'denied';
      if (v !== 'yes') allYes = false;
    }
    return allYes ? 'recording' : 'pending';
  }

  /** Späť do efemérneho stavu (default). */
  reset(): void {
    this.requested = false;
    for (const id of this.votes.keys()) {
      this.votes.set(id, 'pending');
    }
  }

  /** Read-only pohľad pre UI. */
  snapshot(): { requested: boolean; votes: Record<string, Vote> } {
    return {
      requested: this.requested,
      votes: Object.fromEntries(this.votes),
    };
  }
}
