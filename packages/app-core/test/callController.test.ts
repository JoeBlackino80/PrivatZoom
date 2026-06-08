import { describe, it, expect, vi } from 'vitest';
import { CallController } from '../src/callController.js';
import { AgeGate, MemoryStore } from '@zavoj/safety';
import type {
  ICallTransport,
  IAccountStore,
  Account,
  RemoteParticipant,
  Plan,
  RoomLink,
} from '@zavoj/rooms';

/** Fake transport — zaznamená connect/disconnect a stream. */
class FakeTransport implements ICallTransport {
  connected: { roomId: string; stream: MediaStream } | null = null;
  disconnected = false;
  constructor(readonly e2ee = true) {}
  async connect(roomId: string, stream: MediaStream): Promise<void> {
    this.connected = { roomId, stream };
  }
  async disconnect(): Promise<void> {
    this.disconnected = true;
  }
  onParticipant(_cb: (p: RemoteParticipant) => void): void {}
  onRemoteTrack(_cb: (p: RemoteParticipant, t: MediaStreamTrack) => void): void {}
}

/** Fake účty s daným plánom. */
class FakeAccounts implements IAccountStore {
  constructor(private plan: Plan) {}
  async current(): Promise<Account | null> {
    return { id: 'u1', plan: this.plan };
  }
  async anonymousSession(_roomId: string): Promise<Account> {
    return { id: 'anon-u1', plan: this.plan };
  }
  async signOut(): Promise<void> {}
}

const STREAM = {} as MediaStream;
const NOW = Date.parse('2026-06-08T00:00:00Z');

function adultGate(): AgeGate {
  const g = new AgeGate(18, new MemoryStore());
  g.confirm(new Date('1990-01-01'), new Date(NOW));
  return g;
}

function makeController(plan: Plan, opts: { gate?: AgeGate; e2ee?: boolean } = {}) {
  const transport = new FakeTransport(opts.e2ee ?? true);
  const accounts = new FakeAccounts(plan);
  const ctrl = new CallController({
    transport,
    accounts,
    ageGate: opts.gate ?? adultGate(),
    now: () => NOW,
  });
  return { ctrl, transport, accounts };
}

const openLink: RoomLink = { roomId: 'room-1', expiresAt: 0, oneTime: false };

describe('CallController.joinByLink', () => {
  it('happy path: pripojí, session connected, stream na transport', async () => {
    const { ctrl, transport } = makeController('pro');
    const res = await ctrl.joinByLink(openLink, { mode: 'avatar' }, STREAM);
    expect(ctrl.state).toBe('connected');
    expect(transport.connected?.roomId).toBe('room-1');
    expect(transport.connected?.stream).toBe(STREAM);
    expect(res.account.id).toBe('anon-u1');
    expect(res.e2ee).toBe(true);
  });

  it('blokne, ak veková brána nie je splnená', async () => {
    const { ctrl, transport } = makeController('pro', {
      gate: new AgeGate(18, new MemoryStore()), // nepotvrdená
    });
    await expect(ctrl.joinByLink(openLink, {}, STREAM)).rejects.toThrow(/veková brána/);
    expect(transport.connected).toBeNull(); // nič sa nepripojilo
  });

  it('odmietne expirovaný link (a nepripojí transport)', async () => {
    const { ctrl, transport } = makeController('pro');
    const expired: RoomLink = { roomId: 'r', expiresAt: NOW - 1, oneTime: false };
    await expect(ctrl.joinByLink(expired, {}, STREAM)).rejects.toThrow(/expired/);
    expect(transport.connected).toBeNull();
  });

  it('free plán zoslabí clonu na blur + vodoznak', async () => {
    const { ctrl } = makeController('free');
    const res = await ctrl.joinByLink(openLink, { mode: 'avatar', sceneScrub: true }, STREAM);
    expect(res.config.mode).toBe('blur');
    expect(res.config.sceneScrub).toBe(false);
    expect(res.watermark).toBe(true);
  });

  it('pro plán ponechá clonu a bez vodoznaku', async () => {
    const { ctrl } = makeController('pro');
    const res = await ctrl.joinByLink(openLink, { mode: 'silhouette' }, STREAM);
    expect(res.config.mode).toBe('silhouette');
    expect(res.watermark).toBe(false);
  });

  it('jednorazový link druhýkrát zlyhá', async () => {
    const { ctrl } = makeController('pro');
    const once: RoomLink = { roomId: 'once-1', expiresAt: 0, oneTime: true };
    await ctrl.joinByLink(once, {}, STREAM);
    await expect(ctrl.joinByLink(once, {}, STREAM)).rejects.toThrow(/used/);
  });

  it('účastník je v consent ledgeri, nahrávanie efemérne (zakázané)', async () => {
    const { ctrl } = makeController('pro');
    await ctrl.joinByLink(openLink, {}, STREAM);
    expect(ctrl.consent.state()).toBe('idle');
    expect(ctrl.consent.canRecord()).toBe(false);
  });
});

describe('CallController.leave', () => {
  it('ukončí session a transport, resetne súhlas', async () => {
    const { ctrl, transport } = makeController('pro');
    await ctrl.joinByLink(openLink, {}, STREAM);
    await ctrl.leave();
    expect(transport.disconnected).toBe(true);
    expect(ctrl.state).toBe('ended');
  });
});

describe('privacy invariant', () => {
  it('na transport ide presne ten stream, ktorý dostal (zaclonený platformou)', async () => {
    const { ctrl, transport } = makeController('pro');
    const tagged = { id: 'anonymized' } as unknown as MediaStream;
    const spy = vi.spyOn(transport, 'connect');
    await ctrl.joinByLink(openLink, {}, tagged);
    expect(spy).toHaveBeenCalledWith('room-1', tagged);
  });
});
