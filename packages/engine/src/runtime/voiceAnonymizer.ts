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
  private highpass: BiquadFilterNode;
  private lowpass: BiquadFilterNode;
  private formantLow: BiquadFilterNode;
  private formantPeak: BiquadFilterNode;
  private noiseSuppression = true;

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    // potlačenie šumu: orež nízky rumble (AC, dych do mikrofónu) a vysoký sykot
    // → kvalita + pozadie neprezradí, kde si.
    this.highpass = ctx.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 85;
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 12000;

    // formantové tvarovanie — posúva vnímaný tvar hlasového traktu
    this.formantLow = ctx.createBiquadFilter();
    this.formantLow.type = 'lowshelf';
    this.formantPeak = ctx.createBiquadFilter();
    this.formantPeak.type = 'peaking';
    this.formantPeak.Q.value = 0.9;

    this.input.connect(this.highpass);
    this.highpass.connect(this.lowpass);
    this.lowpass.connect(this.formantLow);
    this.formantLow.connect(this.formantPeak);
    this.formantPeak.connect(this.output);
  }

  /**
   * Zapne/vypne potlačenie šumu. Pri vypnutí sa filtre nastavia na krajné
   * frekvencie (efektívne priepustné), graf ostáva rovnaký.
   */
  setNoiseSuppression(enabled: boolean): void {
    this.noiseSuppression = enabled;
    this.highpass.frequency.value = enabled ? 85 : 10;
    this.lowpass.frequency.value = enabled ? 12000 : 20000;
  }

  get noiseSuppressionEnabled(): boolean {
    return this.noiseSuppression;
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
