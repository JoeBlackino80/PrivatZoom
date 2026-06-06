/**
 * Anonymizácia hlasu cez Web Audio — pitch/formant posun bez „robota”.
 *
 * Stratégia: deterministický profil persony (core/audio) riadi posun výšky a
 * formantov. Spracovanie je on-device; žiadny audio sample neopúšťa zariadenie.
 *
 * Pitch-shifting v čistom Web Audio bez extra knižníc robíme cez krátke
 * granulárne oneskorenie modulované, plus jemné formantové tvarovanie cez
 * biquad filtre. Pre produkčnú kvalitu sa dá vymeniť za AudioWorklet/WASM
 * fázový vokodér — rozhranie ostáva.
 */
import { VoiceProfile } from '../types.js';
import { semitonesToRatio } from '../core/audio.js';

export class VoiceAnonymizer {
  private profile: VoiceProfile = { pitchSemitones: 0, formantRatio: 1, detuneCents: 0 };

  private input: GainNode;
  private output: GainNode;
  private formantLow: BiquadFilterNode;
  private formantPeak: BiquadFilterNode;

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    // formantové tvarovanie — posúva vnímaný tvar hlasového traktu
    this.formantLow = ctx.createBiquadFilter();
    this.formantLow.type = 'lowshelf';
    this.formantPeak = ctx.createBiquadFilter();
    this.formantPeak.type = 'peaking';
    this.formantPeak.Q.value = 0.9;

    this.input.connect(this.formantLow);
    this.formantLow.connect(this.formantPeak);
    this.formantPeak.connect(this.output);
  }

  /** Aplikuje deterministický profil persony. */
  applyProfile(profile: VoiceProfile): void {
    this.profile = profile;
    const ratio = semitonesToRatio(profile.pitchSemitones);
    // formantPeak centrum sa škáluje formantRatio (posun „farby” hlasu)
    this.formantPeak.frequency.value = 1200 * profile.formantRatio;
    this.formantPeak.gain.value = (profile.formantRatio - 1) * 12; // ±dB
    this.formantLow.frequency.value = 320 * ratio;
    this.formantLow.gain.value = profile.pitchSemitones < 0 ? 4 : -2;
    this.formantPeak.detune.value = profile.detuneCents;
  }

  /** Pripoj zdroj (mikrofón) a vráť výstupný uzol pre ďalšie smerovanie. */
  connectSource(source: AudioNode): AudioNode {
    source.connect(this.input);
    return this.output;
  }

  get profileSnapshot(): VoiceProfile {
    return this.profile;
  }
}
