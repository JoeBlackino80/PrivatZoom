/// Dart port of packages/engine/src/core/config.ts.
/// Drží sa rovnakého kontraktu a testovacích vektorov ako TypeScript jadro.

enum AnonMode { blur, pixelate, mask, silhouette, avatar }

enum BackgroundScrub { off, blur, replace }

class AnonConfig {
  final AnonMode mode;
  final double intensity; // 0..1
  final BackgroundScrub scrubBackground;
  final bool failSafe;
  final bool multiFace;

  const AnonConfig({
    this.mode = AnonMode.pixelate,
    this.intensity = 0.6,
    this.scrubBackground = BackgroundScrub.blur,
    this.failSafe = true,
    this.multiFace = true,
  });

  AnonConfig copyWith({
    AnonMode? mode,
    double? intensity,
    BackgroundScrub? scrubBackground,
    bool? failSafe,
    bool? multiFace,
  }) {
    return AnonConfig(
      mode: mode ?? this.mode,
      intensity: clampDouble(intensity ?? this.intensity, 0, 1),
      scrubBackground: scrubBackground ?? this.scrubBackground,
      failSafe: failSafe ?? this.failSafe,
      multiFace: multiFace ?? this.multiFace,
    );
  }
}

double clampDouble(double value, double min, double max) {
  if (value.isNaN) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/// 0 -> jemné (4px), 1 -> hrubé (48px). Zhodné s intensityToBlockSize v TS.
int intensityToBlockSize(double intensity) {
  final t = clampDouble(intensity, 0, 1);
  return (4 + t * 44).round();
}

/// 0 -> 2px, 1 -> 24px. Zhodné s intensityToBlurRadius v TS.
int intensityToBlurRadius(double intensity) {
  final t = clampDouble(intensity, 0, 1);
  return (2 + t * 22).round();
}
