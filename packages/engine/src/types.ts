/**
 * ZÁVOJ engine — verejné typy a kontrakt.
 *
 * Tieto typy sú zdieľané medzi web showcase, Flutter portom a SDK.
 * Sú zámerne bez závislostí na prehliadači, aby boli portovateľné.
 */

/** RGB farba (0..255 na kanál). */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Anonymizačné režimy obrazu (v1). */
export type AnonMode =
  | 'blur'
  | 'pixelate'
  | 'mask'
  | 'silhouette'
  | 'avatar';

/** Spôsob spracovania pozadia (prostredie ťa tiež prezradí). */
export type BackgroundScrub = 'off' | 'blur' | 'replace';

/** Konfigurácia anonymizácie obrazu. */
export interface AnonConfig {
  /** Aktívny režim clony. */
  mode: AnonMode;
  /** Sila efektu 0..1 (mapuje sa na blok pixelov / polomer blur / atď.). */
  intensity: number;
  /** Spracovanie pozadia. */
  scrubBackground: BackgroundScrub;
  /** Keď detekcia tváre vypadne, zaclonení sa celý obraz. */
  failSafe: boolean;
  /** Chrániť všetky tváre v zábere, nielen najväčšiu. */
  multiFace: boolean;
}

/** Obdĺžnik tváre v normalizovaných súradniciach (0..1). */
export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Skóre dôvery detekcie 0..1. */
  score: number;
}

/** Telemetria engine — privacy invariant je bytesSent === 0. */
export interface EngineStats {
  /** Počet bytov video/audio dát odoslaných zo zariadenia. VŽDY 0. */
  bytesSent: number;
  /** Aktuálne odhadované FPS spracovania. */
  fps: number;
  /** Počet detegovaných tvárí v poslednom frame. */
  faces: number;
  /** Či je práve aktívna fail-safe celoplošná clona. */
  covered: boolean;
}

/** Deterministický hlasový profil persony. */
export interface VoiceProfile {
  /** Posun výšky v poltónoch (záporné = nižší hlas). */
  pitchSemitones: number;
  /** Posun formantov 0.5..2 (mení vnímaný tvar hlasového traktu). */
  formantRatio: number;
  /** Jemné rozladenie pre konzistentný „syntetický” charakter. */
  detuneCents: number;
}

/** Predvolená bezpečná konfigurácia. */
export const DEFAULT_CONFIG: AnonConfig = {
  mode: 'pixelate',
  intensity: 0.6,
  scrubBackground: 'blur',
  failSafe: true,
  multiFace: true,
};
