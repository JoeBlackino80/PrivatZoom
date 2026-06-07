/**
 * Bindings kontrakt (Fáza 3). Definuje minimálne, stabilné API, ktoré každý
 * platform binding (iOS / Android / Web) musí poskytnúť nad engine. Integrátor
 * kóduje voči tomuto, nie voči vnútornostiam jadra → verzie sa dajú vyvíjať.
 */
import type { AnonConfig, EngineStats } from '@zavoj/engine';
import type { SdkPolicy } from './policies.js';

export interface ZavojBinding {
  /** Inicializuj engine s politikou integrátora. */
  init(policy: SdkPolicy): Promise<void>;
  /** Aplikuj používateľské zmeny (prejdú cez politiku — viď resolveConfig). */
  setConfig(changes: Partial<AnonConfig>): void;
  /** Aktuálna efektívna konfigurácia. */
  getConfig(): AnonConfig;
  /** Reveal-on-command. */
  setRevealed(revealed: boolean): void;
  /** Telemetria vrátane on-device invariantu bytesSent === 0. */
  getStats(): EngineStats;
  /** Uvoľni zdroje. */
  dispose(): void;
}

/** Verzia bindings kontraktu (semver-kompatibilná evolúcia). */
export const BINDING_CONTRACT_VERSION = '0.1.0';
