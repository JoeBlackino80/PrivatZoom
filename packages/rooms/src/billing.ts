/**
 * Plan gating (monetizácia). Mapuje pricing z plánu na konkrétne feature-gates.
 *
 *   Free — len blur + vodoznak
 *   Pro  — všetky režimy, avatar, hlas, HD, scrub pozadia, persony, scrub scény
 *
 * Čistá logika: `gateConfig` zoslabí požadovanú konfiguráciu na to, čo plán
 * dovoľuje — používateľ nikdy „neprejde” cez platobnú bránu len UI trikom.
 */
import type { AnonConfig, AnonMode } from '@zavoj/engine';

export type Plan = 'free' | 'pro';

export interface PlanFeatures {
  /** Povolené režimy clony. */
  modes: AnonMode[];
  /** Pridať vodoznak do výstupu. */
  watermark: boolean;
  /** HD rozlíšenie. */
  hd: boolean;
  /** Scrub pozadia. */
  scrubBackground: boolean;
  /** Scrub scény (auto-blur citlivých regiónov). */
  sceneScrub: boolean;
  /** Anonymizácia hlasu. */
  voice: boolean;
  /** Viacero person + per-kontakt. */
  personas: boolean;
}

export const PLANS: Record<Plan, PlanFeatures> = {
  free: {
    modes: ['blur'],
    watermark: true,
    hd: false,
    scrubBackground: false,
    sceneScrub: false,
    voice: false,
    personas: false,
  },
  pro: {
    modes: ['blur', 'pixelate', 'mask', 'silhouette', 'avatar'],
    watermark: false,
    hd: true,
    scrubBackground: true,
    sceneScrub: true,
    voice: true,
    personas: true,
  },
};

export function features(plan: Plan): PlanFeatures {
  return PLANS[plan];
}

export function canUseMode(plan: Plan, mode: AnonMode): boolean {
  return PLANS[plan].modes.includes(mode);
}

/**
 * Zoslabí požadovanú konfiguráciu na hranice plánu. Vracia bezpečnú
 * konfiguráciu + či sa má pridať vodoznak. Nedovolené voľby spadnú na default
 * plánu namiesto vyhodenia chyby (UX: clona ostane zapnutá, nie vypnutá).
 */
export function gateConfig(
  plan: Plan,
  desired: Partial<AnonConfig>,
): { config: Partial<AnonConfig>; watermark: boolean } {
  const f = PLANS[plan];
  const mode: AnonMode =
    desired.mode && f.modes.includes(desired.mode) ? desired.mode : f.modes[0];

  const config: Partial<AnonConfig> = {
    ...desired,
    mode,
    scrubBackground: f.scrubBackground ? desired.scrubBackground ?? 'off' : 'off',
    sceneScrub: f.sceneScrub ? desired.sceneScrub ?? false : false,
  };
  return { config, watermark: f.watermark };
}
