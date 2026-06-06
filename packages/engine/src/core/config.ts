/**
 * Validácia a normalizácia konfigurácie — jeden zdroj pravdy pre web/mobil/SDK.
 * Čisté funkcie, žiadne side-effecty.
 */
import { AnonConfig, AnonMode, BackgroundScrub, DEFAULT_CONFIG } from '../types.js';

const MODES: readonly AnonMode[] = ['blur', 'pixelate', 'mask', 'silhouette', 'avatar'];
const SCRUBS: readonly BackgroundScrub[] = ['off', 'blur', 'replace'];

/** Oreže hodnotu do rozsahu [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Doplní chýbajúce polia z DEFAULT_CONFIG a oreže/validuje hodnoty.
 * Neznámy mode/scrub spadne na default namiesto vyhodenia výnimky —
 * engine sa nikdy nesmie zaseknúť do neanonymizovaného stavu.
 */
export function normalizeConfig(input: Partial<AnonConfig> | undefined): AnonConfig {
  const cfg = { ...DEFAULT_CONFIG, ...(input ?? {}) };
  return {
    mode: MODES.includes(cfg.mode) ? cfg.mode : DEFAULT_CONFIG.mode,
    intensity: clamp(cfg.intensity, 0, 1),
    scrubBackground: SCRUBS.includes(cfg.scrubBackground)
      ? cfg.scrubBackground
      : DEFAULT_CONFIG.scrubBackground,
    failSafe: Boolean(cfg.failSafe),
    multiFace: Boolean(cfg.multiFace),
  };
}

/**
 * Mapuje intensity (0..1) na veľkosť pixelového bloku (px).
 * 0 → jemné (4px), 1 → hrubé (48px). Monotónne rastúce.
 */
export function intensityToBlockSize(intensity: number): number {
  const t = clamp(intensity, 0, 1);
  return Math.round(4 + t * 44);
}

/**
 * Mapuje intensity (0..1) na polomer box-blur (px).
 * 0 → 2px, 1 → 24px.
 */
export function intensityToBlurRadius(intensity: number): number {
  const t = clamp(intensity, 0, 1);
  return Math.round(2 + t * 22);
}
