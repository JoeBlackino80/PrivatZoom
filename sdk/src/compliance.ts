/**
 * Compliance helpery (Fáza 3, B2B). ZÁVOJ predáva silný GDPR príbeh:
 * data minimization + „žiadne biometrické dáta neopúšťajú zariadenie”.
 * Tieto pomocníky to robia overiteľným — nie len marketingovým tvrdením.
 */

export type DataCategory =
  | 'video'
  | 'audio'
  | 'face-geometry'
  | 'voice-print'
  | 'account-email'
  | 'payment';

export type ProcessingLocation = 'on-device' | 'server' | 'none';

export interface DataInventoryEntry {
  category: DataCategory;
  location: ProcessingLocation;
  retained: boolean;
  purpose: string;
}

/** Biometrické / surové mediálne kategórie, ktoré NESMÚ opustiť zariadenie. */
const BIOMETRIC: ReadonlySet<DataCategory> = new Set([
  'video',
  'audio',
  'face-geometry',
  'voice-print',
]);

/** Referenčný dátový inventár ZÁVOJ — predvolene súladný s data minimization. */
export const ZAVOJ_INVENTORY: DataInventoryEntry[] = [
  { category: 'video', location: 'on-device', retained: false, purpose: 'anonymizácia obrazu' },
  { category: 'audio', location: 'on-device', retained: false, purpose: 'anonymizácia hlasu' },
  { category: 'face-geometry', location: 'on-device', retained: false, purpose: 'detekcia tváre' },
  { category: 'voice-print', location: 'on-device', retained: false, purpose: 'persona hlas' },
  { category: 'account-email', location: 'server', retained: true, purpose: 'účet (voliteľné)' },
  { category: 'payment', location: 'server', retained: true, purpose: 'predplatné cez Stripe' },
];

/** Biometrické kategórie, ktoré (chybne) opúšťajú zariadenie — má byť prázdne. */
export function biometricEgress(inventory: DataInventoryEntry[]): DataInventoryEntry[] {
  return inventory.filter((e) => BIOMETRIC.has(e.category) && e.location === 'server');
}

/**
 * Súlad s data minimization: žiadne biometrické dáta na server a žiadne
 * biometrické dáta sa neretinujú.
 */
export function isGdprMinimized(inventory: DataInventoryEntry[]): boolean {
  if (biometricEgress(inventory).length > 0) return false;
  return inventory.every((e) => !(BIOMETRIC.has(e.category) && e.retained));
}

export interface EgressAudit {
  compliant: boolean;
  reason?: string;
}

/**
 * Overí privacy invariant engine: počas spracovania neodišiel žiadny byte
 * video/audio dát. `bytesSent` pochádza z EngineStats.
 */
export function auditEgress(bytesSent: number): EgressAudit {
  if (bytesSent === 0) return { compliant: true };
  return {
    compliant: false,
    reason: `očakávané 0 bytov, namerané ${bytesSent} — porušený on-device invariant`,
  };
}

/** Predvolená retenčná politika: efemérne, žiadne nahrávky. */
export const EPHEMERAL_RETENTION = {
  recordings: false,
  transcripts: false,
  mediaRetentionMs: 0,
} as const;
