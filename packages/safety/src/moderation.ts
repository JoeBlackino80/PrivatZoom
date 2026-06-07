/**
 * Report / block. Bez tohto neprejde store review a B2B klienti
 * (telemedicína, linky pomoci) to vyžadujú zmluvne.
 *
 * Pure, in-memory model s rate-limitom proti spamu reportov. Perzistencia a
 * doručenie na server sú vrstva nad týmto (appka / SDK).
 */

export type ReportReason =
  | 'harassment'
  | 'abuse'
  | 'nudity'
  | 'csae'
  | 'threats'
  | 'spam'
  | 'other';

export interface Report {
  reporterId: string;
  subjectId: string;
  reason: ReportReason;
  note?: string;
  at: number;
}

export interface ReportOptions {
  /** Max reportov od jedného reportéra na jeden subjekt v okne. */
  maxPerWindow: number;
  /** Dĺžka okna v ms. */
  windowMs: number;
}

const DEFAULT_REPORT_OPTS: ReportOptions = {
  maxPerWindow: 3,
  windowMs: 60 * 60 * 1000, // 1 hodina
};

export interface ReportResult {
  accepted: boolean;
  reason?: string;
}

/**
 * Moderačný store: blokovanie používateľov a prijímanie reportov s rate-limitom.
 * Blokovanie je okamžité a lokálne (nepotrebuje server) — chráni používateľa hneď.
 */
export class Moderation {
  private blocked = new Set<string>();
  private reports: Report[] = [];
  private readonly opts: ReportOptions;

  constructor(options: Partial<ReportOptions> = {}) {
    this.opts = { ...DEFAULT_REPORT_OPTS, ...options };
  }

  // ---- block ----
  block(userId: string): void {
    this.blocked.add(userId);
  }
  unblock(userId: string): void {
    this.blocked.delete(userId);
  }
  isBlocked(userId: string): boolean {
    return this.blocked.has(userId);
  }
  blockedList(): string[] {
    return [...this.blocked];
  }

  // ---- report ----
  /**
   * Podaj report. Odmietne sa pri prekročení rate-limitu (anti-spam).
   * Report na seba samého je vždy odmietnutý.
   */
  report(
    reporterId: string,
    subjectId: string,
    reason: ReportReason,
    note?: string,
    now: number = Date.now(),
  ): ReportResult {
    if (reporterId === subjectId) {
      return { accepted: false, reason: 'nemožno reportovať seba' };
    }
    const recent = this.reports.filter(
      (r) =>
        r.reporterId === reporterId &&
        r.subjectId === subjectId &&
        now - r.at < this.opts.windowMs,
    );
    if (recent.length >= this.opts.maxPerWindow) {
      return { accepted: false, reason: 'príliš veľa reportov, skús neskôr' };
    }
    const record: Report = { reporterId, subjectId, reason, at: now };
    if (note !== undefined) record.note = note;
    this.reports.push(record);
    return { accepted: true };
  }

  /** Všetky reporty na daný subjekt (pre review tooling). */
  reportsAgainst(subjectId: string): Report[] {
    return this.reports.filter((r) => r.subjectId === subjectId);
  }

  /** Celkový počet prijatých reportov. */
  get reportCount(): number {
    return this.reports.length;
  }
}
