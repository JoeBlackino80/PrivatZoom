/**
 * CallController — aplikačná orchestrácia jedného hovoru. Zloží dokopy:
 *
 *   safety (veková brána, súhlas s nahrávaním)
 *   rooms  (validita linku, plan gating, session state)
 *   adapters (transport: LiveKit; účty: Supabase) — cez rozhrania
 *   engine (typ AnonConfig — efektívnu clonu aplikuje platformová vrstva na engine)
 *
 * Je zámerne headless (žiadne DOM/kamera) → testovateľné a zdieľané appkou aj
 * SDK. Platformová vrstva (web/Flutter) dodá zaclonený MediaStream a aplikuje
 * vrátený `config` na VideoAnonymizer.
 *
 * Privacy invariant: na transport ide LEN zaclonený stream; gateConfig clonu
 * nikdy nevypne, veková brána blokuje vstup, súhlas s nahrávaním je efemérny.
 */
import type { AnonConfig } from '@zavoj/engine';
import {
  RoomSession,
  gateConfig,
  isLinkValid,
  type RoomLink,
  type ICallTransport,
  type IAccountStore,
  type Account,
} from '@zavoj/rooms';
import { AgeGate, RecordingConsent } from '@zavoj/safety';

export interface CallControllerDeps {
  transport: ICallTransport;
  accounts: IAccountStore;
  ageGate: AgeGate;
  /** Pre testy injektovateľný čas. */
  now?: () => number;
}

export interface JoinResult {
  account: Account;
  /** Efektívna konfigurácia clony po plan gatingu (aplikuj na engine). */
  config: Partial<AnonConfig>;
  /** Pridať vodoznak (free plán). */
  watermark: boolean;
  /** Je transport E2EE? (mal by byť invariant.) */
  e2ee: boolean;
}

export class CallController {
  private readonly deps: CallControllerDeps;
  private readonly now: () => number;
  readonly consent = new RecordingConsent();
  private _session: RoomSession | null = null;
  private usedLinks = new Set<string>();

  constructor(deps: CallControllerDeps) {
    this.deps = deps;
    this.now = deps.now ?? (() => Date.now());
  }

  get session(): RoomSession | null {
    return this._session;
  }

  /**
   * Pripojí sa do miestnosti cez link. Poradie krokov je bezpečnostne dôležité:
   * veková brána → validita linku → účet → plan gating → session/transport.
   */
  async joinByLink(
    link: RoomLink,
    desiredConfig: Partial<AnonConfig>,
    anonymizedStream: MediaStream,
  ): Promise<JoinResult> {
    if (!this.deps.ageGate.isPassed()) {
      throw new Error('ZÁVOJ: veková brána nie je splnená.');
    }

    const validity = isLinkValid(link, {
      now: this.now(),
      used: this.usedLinks.has(link.roomId),
    });
    if (!validity.valid) {
      throw new Error(`ZÁVOJ: link neplatný (${validity.reason}).`);
    }
    if (link.oneTime) this.usedLinks.add(link.roomId);

    const account = await this.deps.accounts.anonymousSession(link.roomId);
    const { config, watermark } = gateConfig(account.plan, desiredConfig);

    this._session = new RoomSession(link.roomId);
    this._session.join();
    await this.deps.transport.connect(link.roomId, anonymizedStream);
    this._session.onConnected();

    this.consent.addParticipant(account.id);

    return { account, config, watermark, e2ee: this.deps.transport.e2ee };
  }

  /** Opustí hovor — ukončí session a transport (efemérne, nič sa neukladá). */
  async leave(): Promise<void> {
    await this.deps.transport.disconnect();
    this._session?.leave();
    this.consent.reset();
  }

  /** Stav hovoru pre UI. */
  get state(): string {
    return this._session?.state ?? 'lobby';
  }
}
