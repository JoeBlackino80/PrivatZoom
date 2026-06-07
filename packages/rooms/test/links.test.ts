import { describe, it, expect } from 'vitest';
import {
  createRoomId,
  encodeRoomToken,
  buildRoomUrl,
  decodeRoomLink,
  isLinkValid,
  createTimedLink,
  type RoomLink,
} from '../src/links.js';

describe('createRoomId', () => {
  it('má požadovanú dĺžku a bezpečnú abecedu', () => {
    const id = createRoomId(8, mulberry(1));
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[a-z2-9]+$/);
    expect(id).not.toMatch(/[0o1li]/); // mätúce znaky vynechané
  });
  it('je deterministický pre daný rng', () => {
    expect(createRoomId(10, mulberry(42))).toBe(createRoomId(10, mulberry(42)));
  });
});

describe('encode/decode link', () => {
  it('round-trip zachová pole', () => {
    const link: RoomLink = { roomId: 'abc23xyz', expiresAt: 1_700_000_000_000, oneTime: true };
    const decoded = decodeRoomLink(encodeRoomToken(link));
    expect(decoded).toEqual(link);
  });

  it('dekóduje aj z plného URL', () => {
    const link: RoomLink = { roomId: 'room9', expiresAt: 0, oneTime: false };
    const url = buildRoomUrl(link, 'https://zavoj.app/');
    expect(url).toContain('/#/r/');
    expect(decodeRoomLink(url)).toEqual(link);
  });

  it('neplatný token vráti null', () => {
    expect(decodeRoomLink('@@@nieje-token@@@')).toBeNull();
  });
});

describe('isLinkValid', () => {
  it('link bez expirácie je vždy platný', () => {
    const link: RoomLink = { roomId: 'r', expiresAt: 0, oneTime: false };
    expect(isLinkValid(link, { now: 9_999_999 }).valid).toBe(true);
  });

  it('expirovaný link je neplatný', () => {
    const link = createTimedLink('r', 1000, 0);
    expect(isLinkValid(link, { now: 500 }).valid).toBe(true);
    const res = isLinkValid(link, { now: 2000 });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('expired');
  });

  it('jednorazový link po použití neplatí', () => {
    const link: RoomLink = { roomId: 'r', expiresAt: 0, oneTime: true };
    expect(isLinkValid(link, { now: 1, used: false }).valid).toBe(true);
    const res = isLinkValid(link, { now: 1, used: true });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('used');
  });
});

/** Malý deterministický PRNG pre testy. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
