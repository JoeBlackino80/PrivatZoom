/**
 * Web napojenie @zavoj/rooms: generovanie link-miestností (jednorazové /
 * časované) a efemérny anonymný chat.
 *
 * Showcase je single-user, takže chat je lokálny a efemérny — v appke (Fáza 2)
 * pôjde cez E2EE data-channel LiveKitu. Demonštruje UX a „nič sa neukladá”.
 */
import { createRoomId, createTimedLink, buildRoomUrl, type RoomLink } from '@zavoj/rooms';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`chýba #${id}`);
  return el as T;
};

const BASE_URL = typeof location !== 'undefined' ? location.origin : 'https://zavoj.app';

export function initRoomsUi(getPersonaLabel: () => string): void {
  const linkOut = $<HTMLInputElement>('link-out');

  function emit(link: RoomLink): void {
    linkOut.value = buildRoomUrl(link, BASE_URL);
    linkOut.focus();
    linkOut.select();
  }

  $('link-once').addEventListener('click', () => {
    const roomId = createRoomId();
    emit({ roomId, expiresAt: 0, oneTime: true });
  });
  $('link-timed').addEventListener('click', () => {
    const roomId = createRoomId();
    emit(createTimedLink(roomId, 60 * 60 * 1000, Date.now()));
  });

  // efemérny chat (žiadne úložisko)
  const log = $('chat-log');
  const text = $<HTMLInputElement>('chat-text');

  function send(): void {
    const msg = text.value.trim();
    if (!msg) return;
    const row = document.createElement('div');
    row.className = 'chat-msg';
    const who = document.createElement('span');
    who.className = 'chat-who';
    who.textContent = getPersonaLabel();
    const body = document.createElement('span');
    body.textContent = msg;
    row.append(who, body);
    log.append(row);
    log.scrollTop = log.scrollHeight;
    text.value = '';
  }

  $('chat-send').addEventListener('click', send);
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
}
