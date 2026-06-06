/**
 * SDK politiky (Fáza 3 kontrakt). Definuje, koľko kontroly má koncový používateľ
 * vs. integrátor. Pre vertikály ako telemedicína je dôležité vedieť anonymizáciu
 * VYNÚTIŤ (force-on), inde stačí ponúknuť (user-choice).
 *
 * Importuje typy z @zavoj/engine — jeden zdroj pravdy pre konfiguráciu.
 */
import type { AnonConfig } from '@zavoj/engine';

export type PolicyMode = 'force-on' | 'user-choice' | 'force-off';

export interface SdkPolicy {
  /** Či a ako môže používateľ meniť anonymizáciu. */
  mode: PolicyMode;
  /** Konfigurácia vynútená/predvolená integrátorom. */
  baseConfig: Partial<AnonConfig>;
  /** Polia, ktoré používateľ NESMIE meniť (napr. ['failSafe']). */
  locked?: (keyof AnonConfig)[];
}

/**
 * Spojí používateľské zmeny s politikou. Pri 'force-on' sa zamknuté polia a
 * vždy `failSafe` držia podľa integrátora; používateľ nikdy nezníži ochranu
 * pod nastavený základ.
 */
export function resolveConfig(
  policy: SdkPolicy,
  userChanges: Partial<AnonConfig>,
): Partial<AnonConfig> {
  if (policy.mode === 'force-off') return { ...policy.baseConfig };

  const locked = new Set<keyof AnonConfig>(policy.locked ?? []);
  if (policy.mode === 'force-on') locked.add('failSafe');

  const merged: Partial<AnonConfig> = { ...policy.baseConfig, ...userChanges };
  for (const key of locked) {
    if (key in policy.baseConfig) {
      (merged as Record<string, unknown>)[key] = (
        policy.baseConfig as Record<string, unknown>
      )[key];
    }
  }
  if (policy.mode === 'force-on') merged.failSafe = true;
  return merged;
}
