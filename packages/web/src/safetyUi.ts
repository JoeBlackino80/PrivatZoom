/**
 * Napojenie anti-abuse vrstvy (@zavoj/safety) na web showcase.
 *  - Veková brána pri vstupe (perzistentná cez localStorage).
 *  - Indikátor súhlasu s nahrávaním (efemérne defaultne).
 *  - Report / block.
 *
 * Showcase je single-user, takže „druhý účastník” je simulovaný, aby sa dalo
 * ukázať pravidlo „nahráva sa až keď súhlasia všetci”.
 */
import {
  AgeGate,
  RecordingConsent,
  Moderation,
  type ConsentState,
  type ReportReason,
} from '@zavoj/safety';

const MIN_AGE = 18;
const ME = 'ja';
const PEER = 'peer';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`chýba #${id}`);
  return el as T;
};

/** localStorage adapter (Web Storage spĺňa KeyValueStore kontrakt). */
const store = window.localStorage;

export function initAgeGate(): void {
  const gate = new AgeGate(MIN_AGE, store);
  const overlay = $('age-gate');
  if (gate.isPassed()) {
    overlay.classList.add('hidden');
    return;
  }
  const birth = $<HTMLInputElement>('birth');
  const error = $('age-error');
  $('age-confirm').addEventListener('click', () => {
    const res = gate.confirm(new Date(birth.value));
    if (res.passed) {
      overlay.classList.add('hidden');
    } else {
      error.textContent = res.reason ?? 'overenie zlyhalo';
    }
  });
}

export function initSafetyPanel(): void {
  const consent = new RecordingConsent();
  const mod = new Moderation();

  const indicator = $('consent-indicator');
  const requestBtn = $<HTMLButtonElement>('rec-request');
  const consentBtn = $<HTMLButtonElement>('rec-consent');
  const denyBtn = $<HTMLButtonElement>('rec-deny');
  const reportBtn = $<HTMLButtonElement>('report-btn');
  const blockBtn = $<HTMLButtonElement>('block-btn');
  const reasonSel = $<HTMLSelectElement>('report-reason');
  const status = $('safety-status');

  const PILL: Record<ConsentState, { cls: string; text: string }> = {
    idle: { cls: 'idle', text: '⚪ efemérne · nenahráva sa' },
    pending: { cls: 'pending', text: '🟡 čaká sa na súhlas všetkých' },
    recording: { cls: 'recording', text: '🔴 nahráva sa (so súhlasom)' },
    denied: { cls: 'denied', text: '⛔ nahrávanie odmietnuté' },
  };

  function refresh(): void {
    const s = consent.state();
    const p = PILL[s];
    indicator.className = `consent-pill ${p.cls}`;
    indicator.textContent = p.text;
    const active = s === 'pending';
    consentBtn.disabled = !active;
    denyBtn.disabled = !active;
  }

  requestBtn.addEventListener('click', () => {
    consent.addParticipant(ME);
    consent.addParticipant(PEER);
    consent.request();
    consent.setConsent(PEER, true); // simulovaný druhý účastník už súhlasil
    refresh();
  });
  consentBtn.addEventListener('click', () => {
    consent.setConsent(ME, true);
    refresh();
  });
  denyBtn.addEventListener('click', () => {
    consent.setConsent(ME, false);
    refresh();
  });

  reportBtn.addEventListener('click', () => {
    const res = mod.report(ME, PEER, reasonSel.value as ReportReason);
    status.textContent = res.accepted
      ? `Report odoslaný (${mod.reportCount} spolu).`
      : `Report zamietnutý: ${res.reason}`;
  });
  blockBtn.addEventListener('click', () => {
    if (mod.isBlocked(PEER)) {
      mod.unblock(PEER);
      status.textContent = 'Účastník odblokovaný.';
      blockBtn.textContent = 'Blokovať';
    } else {
      mod.block(PEER);
      status.textContent = 'Účastník zablokovaný (okamžite, lokálne).';
      blockBtn.textContent = 'Odblokovať';
    }
  });

  refresh();
}
