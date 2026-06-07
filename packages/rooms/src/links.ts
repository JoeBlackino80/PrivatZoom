/**
 * Link-based anonymné miestnosti. Bez účtu sa dá pripojiť cez link.
 * Podpora jednorazových a časovaných linkov (v2).
 *
 * Čistá logika: generovanie ID, kódovanie/dekódovanie tokenu a validita.
 * `now` aj `rng` sú injektovateľné → deterministické testy.
 */

export interface RoomLink {
  /** Identifikátor miestnosti. */
  roomId: string;
  /** ms epoch, po ktorom link expiruje; 0 = bez expirácie. */
  expiresAt: number;
  /** Jednorazový link — po prvom použití neplatný. */
  oneTime: boolean;
}

const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // bez podobných znakov (0/o, 1/l/i)

/** Vygeneruje krátky room ID. `rng` vracia [0,1) (default Math.random). */
export function createRoomId(length = 8, rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ID_ALPHABET[Math.floor(rng() * ID_ALPHABET.length)];
  }
  return out;
}

// --- base64url (portable: btoa/atob sú v Node 16+ aj v prehliadači) ---

function toBase64Url(json: string): string {
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64)));
}

interface TokenPayload {
  r: string;
  e: number;
  o: 0 | 1;
}

/** Zakóduje link do tokenu (kompaktný payload). */
export function encodeRoomToken(link: RoomLink): string {
  const payload: TokenPayload = {
    r: link.roomId,
    e: link.expiresAt,
    o: link.oneTime ? 1 : 0,
  };
  return toBase64Url(JSON.stringify(payload));
}

/** Postaví plný link na pripojenie. */
export function buildRoomUrl(link: RoomLink, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/#/r/${encodeRoomToken(link)}`;
}

/** Dekóduje token alebo plný link späť na RoomLink; null ak je neplatný. */
export function decodeRoomLink(tokenOrUrl: string): RoomLink | null {
  const match = tokenOrUrl.match(/\/r\/([^/?#]+)/);
  const token = match ? match[1] : tokenOrUrl;
  try {
    const payload = JSON.parse(fromBase64Url(token)) as TokenPayload;
    if (typeof payload.r !== 'string' || typeof payload.e !== 'number') return null;
    return { roomId: payload.r, expiresAt: payload.e, oneTime: payload.o === 1 };
  } catch {
    return null;
  }
}

export interface ValidityResult {
  valid: boolean;
  reason?: 'expired' | 'used';
}

/** Overí platnosť linku k času `now`. `used` značí spotrebovaný jednorazový link. */
export function isLinkValid(
  link: RoomLink,
  opts: { now: number; used?: boolean },
): ValidityResult {
  if (link.expiresAt > 0 && opts.now > link.expiresAt) {
    return { valid: false, reason: 'expired' };
  }
  if (link.oneTime && opts.used) {
    return { valid: false, reason: 'used' };
  }
  return { valid: true };
}

/** Pomocník: vytvor časovaný link platný `ttlMs` od `now`. */
export function createTimedLink(
  roomId: string,
  ttlMs: number,
  now: number,
  oneTime = false,
): RoomLink {
  return { roomId, expiresAt: now + ttlMs, oneTime };
}
