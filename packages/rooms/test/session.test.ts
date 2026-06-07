import { describe, it, expect } from 'vitest';
import { RoomSession } from '../src/session.js';

describe('RoomSession', () => {
  it('štartuje v lobby', () => {
    expect(new RoomSession('r').state).toBe('lobby');
  });

  it('happy path: lobby → connecting → connected → ended', () => {
    const s = new RoomSession('r');
    s.join();
    expect(s.state).toBe('connecting');
    s.onConnected();
    expect(s.state).toBe('connected');
    expect(s.isLive).toBe(true);
    s.leave();
    expect(s.state).toBe('ended');
    expect(s.isLive).toBe(false);
  });

  it('reconnect cyklus drží isLive', () => {
    const s = new RoomSession('r');
    s.join();
    s.onConnected();
    s.onDropped();
    expect(s.state).toBe('reconnecting');
    expect(s.isLive).toBe(true);
    s.onReconnected();
    expect(s.state).toBe('connected');
  });

  it('neplatný prechod vyhodí chybu', () => {
    const s = new RoomSession('r');
    expect(() => s.onConnected()).toThrow(/neplatný prechod/); // nemožno connected z lobby
  });

  it('z ended sa už nedá nikam', () => {
    const s = new RoomSession('r');
    s.leave();
    expect(s.canTransition('connecting')).toBe(false);
    expect(() => s.join()).toThrow();
  });

  it('listener dostane prechody', () => {
    const s = new RoomSession('r');
    const seen: string[] = [];
    s.onChange((next, prev) => seen.push(`${prev}->${next}`));
    s.join();
    s.onConnected();
    expect(seen).toEqual(['lobby->connecting', 'connecting->connected']);
  });

  it('odhlásenie listenera funguje', () => {
    const s = new RoomSession('r');
    let count = 0;
    const off = s.onChange(() => count++);
    s.join();
    off();
    s.onConnected();
    expect(count).toBe(1);
  });
});
