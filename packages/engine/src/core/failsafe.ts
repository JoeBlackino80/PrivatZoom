/**
 * Fail-safe stavový automat.
 *
 * Bezpečnostne kritické: keď detekcia tváre vypadne, NESMIE prejsť žiadny
 * odkrytý frame. Naopak, krátke výpadky detekcie (1–2 framy) nesmú blikať
 * clonou. Preto hysterézia: clona sa zapne rýchlo, vypne opatrne.
 */

export interface FailSafeOptions {
  /** Po koľkých po sebe idúcich frameoch bez tváre zaclonení (rýchlo). */
  coverAfter: number;
  /** Koľko po sebe idúcich frameov s tvárou treba na odclonenie (opatrne). */
  recoverAfter: number;
}

export const DEFAULT_FAILSAFE: FailSafeOptions = {
  coverAfter: 2,
  recoverAfter: 5,
};

/**
 * Sleduje históriu detekcie a rozhoduje, či má byť obraz zaclonený.
 * Štartuje v zaclonenom stave (covered = true) — radšej skry, kým si istý.
 */
export class FailSafe {
  private readonly opts: FailSafeOptions;
  private covered = true;
  private missStreak = 0;
  private hitStreak = 0;

  constructor(options: Partial<FailSafeOptions> = {}) {
    this.opts = { ...DEFAULT_FAILSAFE, ...options };
  }

  /**
   * Zaznamená výsledok detekcie pre jeden frame a vráti, či má byť
   * obraz zaclonený celoplošnou clonou.
   */
  update(faceDetected: boolean): boolean {
    if (faceDetected) {
      this.hitStreak++;
      this.missStreak = 0;
      if (this.covered && this.hitStreak >= this.opts.recoverAfter) {
        this.covered = false;
      }
    } else {
      this.missStreak++;
      this.hitStreak = 0;
      if (!this.covered && this.missStreak >= this.opts.coverAfter) {
        this.covered = true;
      }
    }
    return this.covered;
  }

  /** Aktuálny stav bez zmeny. */
  isCovered(): boolean {
    return this.covered;
  }

  /** Reset do bezpečného (zaclonneného) stavu. */
  reset(): void {
    this.covered = true;
    this.missStreak = 0;
    this.hitStreak = 0;
  }
}
