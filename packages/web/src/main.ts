/**
 * ZÁVOJ web showcase — drôtuje engine na kameru, mikrofón a UI.
 *
 * Dôkaz, nie produkt: ukazuje, že anonymizácia beží on-device v reálnom čase.
 * Surové video sa NIKDY nezobrazí ani neodošle — render ide len cez engine.
 */
import {
  VideoAnonymizer,
  VoiceAnonymizer,
  BrowserSceneDetector,
  type AnonMode,
  type BackgroundScrub,
  core,
} from '@zavoj/engine';
import { MODELS } from './models.js';
import { initAgeGate, initSafetyPanel } from './safetyUi.js';

// anti-abuse vrstva — veková brána pri vstupe + panel súhlasu/report/block
initAgeGate();
initSafetyPanel();

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`chýba #${id}`);
  return el as T;
};

const video = $<HTMLVideoElement>('cam');
const canvas = $<HTMLCanvasElement>('out');
const startBtn = $<HTMLButtonElement>('start');
const overlay = $<HTMLDivElement>('overlay');

const statFps = $<HTMLSpanElement>('stat-fps');
const statFaces = $<HTMLSpanElement>('stat-faces');
const statCover = $<HTMLSpanElement>('stat-cover');
const bytesLabel = $<HTMLSpanElement>('bytes-label');
const revealBtn = $<HTMLButtonElement>('reveal');
const voiceOnlyPanel = $<HTMLDivElement>('voice-only-panel');

let engine: VideoAnonymizer | null = null;
let voice: VoiceAnonymizer | null = null;
let audioCtx: AudioContext | null = null;
let running = false;

// aktuálny stav UI → konfig
const state = {
  mode: 'pixelate' as AnonMode,
  intensity: 0.6,
  scrubBackground: 'blur' as BackgroundScrub,
  failSafe: true,
  multiFace: true,
  persona: 'zdroj-01',
  voice: false,
  noise: true,
  voiceOnly: false,
  sceneScrub: false,
};

function applyConfig(): void {
  engine?.setConfig({
    mode: state.mode,
    intensity: state.intensity,
    scrubBackground: state.scrubBackground,
    failSafe: state.failSafe,
    multiFace: state.multiFace,
    sceneScrub: state.sceneScrub,
  });
}

// ---- UI bindings ---------------------------------------------------------

function bindSegmented(containerId: string, onPick: (value: string) => void): void {
  const container = $(containerId);
  container.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onPick(btn.dataset.mode ?? btn.dataset.scrub ?? '');
    });
  });
}

bindSegmented('modes', (v) => {
  state.mode = v as AnonMode;
  applyConfig();
});
bindSegmented('scrub', (v) => {
  state.scrubBackground = v as BackgroundScrub;
  applyConfig();
});

$<HTMLInputElement>('intensity').addEventListener('input', (e) => {
  state.intensity = Number((e.target as HTMLInputElement).value) / 100;
  applyConfig();
});
$<HTMLInputElement>('failsafe').addEventListener('change', (e) => {
  state.failSafe = (e.target as HTMLInputElement).checked;
  applyConfig();
});
$<HTMLInputElement>('multiface').addEventListener('change', (e) => {
  state.multiFace = (e.target as HTMLInputElement).checked;
  applyConfig();
});
$<HTMLInputElement>('scenescrub').addEventListener('change', (e) => {
  state.sceneScrub = (e.target as HTMLInputElement).checked;
  applyConfig();
});
// presety person — viac person pre rôzne kontexty (Bod 2)
$<HTMLSelectElement>('persona-preset').addEventListener('change', (e) => {
  const seed = (e.target as HTMLSelectElement).value;
  const modeByPreset: Record<string, AnonMode> = {
    'zdroj-01': 'silhouette',
    'anon-01': 'pixelate',
    'praca-01': 'avatar',
    'zoznamka-01': 'mask',
  };
  state.persona = seed;
  $<HTMLInputElement>('persona').value = seed;
  // prepni aj režim podľa presetu a zvýrazni v UI
  const mode = modeByPreset[seed] ?? state.mode;
  state.mode = mode;
  document.querySelectorAll<HTMLButtonElement>('#modes button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  applyConfig();
  updateVoiceInfo();
  applyVoiceProfile();
});
$<HTMLInputElement>('persona').addEventListener('change', (e) => {
  state.persona = (e.target as HTMLInputElement).value || 'zavoj-default';
  updateVoiceInfo();
  // persona seed sa nastavuje pri init; tu len obnovíme hlasový profil
  applyVoiceProfile();
});
$<HTMLInputElement>('voice').addEventListener('change', (e) => {
  state.voice = (e.target as HTMLInputElement).checked;
  applyVoiceProfile();
});
$<HTMLInputElement>('noise').addEventListener('change', (e) => {
  state.noise = (e.target as HTMLInputElement).checked;
  voice?.setNoiseSuppression(state.noise);
});
$<HTMLInputElement>('voiceonly').addEventListener('change', (e) => {
  state.voiceOnly = (e.target as HTMLInputElement).checked;
  voiceOnlyPanel.classList.toggle('hidden', !state.voiceOnly);
  // kamera vyp. — zastavíme video track, hlas beží ďalej
  const track = (video.srcObject as MediaStream | null)?.getVideoTracks()[0];
  if (track) track.enabled = !state.voiceOnly;
  revealBtn.disabled = state.voiceOnly;
});

// reveal-on-command: hold-to-reveal (pustenie → späť anonymne)
function setReveal(on: boolean): void {
  if (state.voiceOnly) return;
  engine?.setRevealed(on);
  revealBtn.classList.toggle('active', on);
}
revealBtn.addEventListener('pointerdown', () => setReveal(true));
revealBtn.addEventListener('pointerup', () => setReveal(false));
revealBtn.addEventListener('pointerleave', () => setReveal(false));
revealBtn.addEventListener('pointercancel', () => setReveal(false));

function updateVoiceInfo(): void {
  const p = core.personaProfile(state.persona);
  $('voice-info').textContent = `pitch ${p.pitchSemitones > 0 ? '+' : ''}${p.pitchSemitones} pt · formant ${p.formantRatio}`;
}

function applyVoiceProfile(): void {
  if (!voice) return;
  // keď je hlas vypnutý, aplikuj neutrálny profil (žiadny posun)
  voice.applyProfile(
    state.voice
      ? core.personaProfile(state.persona)
      : { pitchSemitones: 0, formantRatio: 1, detuneCents: 0 },
  );
}

// ---- štart kamery + slučka ----------------------------------------------

startBtn.addEventListener('click', () => void start());

async function start(): Promise<void> {
  if (running) return;
  startBtn.disabled = true;
  startBtn.textContent = 'Načítavam model…';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: 'user' },
      audio: true,
    });
    video.srcObject = stream;
    await video.play();

    engine = new VideoAnonymizer({
      mode: state.mode,
      intensity: state.intensity,
      scrubBackground: state.scrubBackground,
      failSafe: state.failSafe,
      multiFace: state.multiFace,
    });
    const sceneDetector = new BrowserSceneDetector();
    await engine.init({
      canvas,
      wasmBasePath: MODELS.wasmBasePath,
      faceModelUrl: MODELS.faceModelUrl,
      segModelUrl: MODELS.segModelUrl,
      personaSeed: state.persona,
      sceneDetector,
    });
    if (!sceneDetector.available) {
      // Shape Detection API nie je v tomto prehliadači — toggle ostane, ale
      // bez detektora nič nerozmaže; informuj používateľa.
      const label = $<HTMLInputElement>('scenescrub').parentElement?.querySelector('small');
      if (label) label.textContent = 'tento prehliadač nepodporuje detekciu scény';
    }

    setupVoice(stream);

    overlay.classList.add('hidden');
    revealBtn.disabled = false;
    running = true;
    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    startBtn.disabled = false;
    startBtn.textContent = 'Skúsiť znova';
    overlay.querySelector('.hint')?.replaceChildren(
      document.createTextNode('Nepodarilo sa spustiť kameru/model: ' + String(err)),
    );
  }
}

function setupVoice(stream: MediaStream): void {
  audioCtx = new AudioContext();
  voice = new VoiceAnonymizer(audioCtx);
  applyVoiceProfile();
  voice.setNoiseSuppression(state.noise);
  const src = audioCtx.createMediaStreamSource(stream);
  const out = voice.connectSource(src);
  // monitorovací výstup len keď je hlas zapnutý (inak ticho — toto je proof)
  const monitor = audioCtx.createGain();
  monitor.gain.value = 0; // nehráme späť do reproduktora (spätná väzba)
  out.connect(monitor).connect(audioCtx.destination);
  updateVoiceInfo();
}

function loop(ts: number): void {
  if (!running || !engine) return;

  // voice-only: kamera vyp., spracovanie videa preskočíme (panel prekrýva canvas)
  if (!state.voiceOnly) {
    engine.processFrame(video, ts);
  }
  const stats = engine.getStats();

  statFps.textContent = state.voiceOnly ? 'voice-only' : `${stats.fps} fps`;
  statFaces.textContent = `${stats.faces} ${stats.faces === 1 ? 'tvár' : 'tvárí'}`;
  statCover.classList.toggle('hidden', state.voiceOnly || !stats.covered);
  // privacy invariant — vždy 0
  bytesLabel.textContent = `on-device · ${stats.bytesSent} bytov odoslaných`;

  requestAnimationFrame(loop);
}

updateVoiceInfo();
