/// Dart port of packages/engine/src/core/audio.ts (persona časť).
/// Deterministický hlasový profil — rovnaký seed → rovnaký hlas naprieč
/// platformami (web aj mobil zdieľajú FNV-1a hash a rovnaké rozsahy).
import 'dart:math' as math;

class VoiceProfile {
  final double pitchSemitones;
  final double formantRatio;
  final int detuneCents;

  const VoiceProfile({
    required this.pitchSemitones,
    required this.formantRatio,
    required this.detuneCents,
  });
}

double semitonesToRatio(double semitones) => math.pow(2, semitones / 12).toDouble();

double centsToRatio(double cents) => math.pow(2, cents / 1200).toDouble();

/// FNV-1a 32-bit, zhodný s hashSeed v TS (stabilný naprieč platformami).
int hashSeed(String seed) {
  int h = 0x811c9dc5;
  for (final code in seed.codeUnits) {
    h ^= code;
    h = (h * 0x01000193) & 0xffffffff;
  }
  return h >>> 0;
}

/// Deterministický ľudsky znejúci profil zo seedu. Rovnaké rozsahy ako TS:
/// pitch -5..+5 pt, formant 0.8..1.25, detune -25..+25 centov.
VoiceProfile personaProfile(String seed) {
  final h = hashSeed(seed);
  final a = (h & 0x3ff) / 0x3ff;
  final b = ((h >>> 10) & 0x3ff) / 0x3ff;
  final c = ((h >>> 20) & 0x3ff) / 0x3ff;

  final pitch = ((a * 10 - 5) * 10).round() / 10;
  final formant = ((0.8 + b * 0.45) * 100).round() / 100;
  final detune = (c * 50 - 25).round();

  return VoiceProfile(
    pitchSemitones: pitch,
    formantRatio: formant,
    detuneCents: detune,
  );
}
