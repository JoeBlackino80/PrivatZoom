/// Dart port of packages/rooms/src/billing.ts (plan gating).
/// Free — len blur + vodoznak; Pro — všetko. gateConfig clonu nikdy nevypne,
/// len zoslabí na hranice plánu.
import 'config.dart';

enum Plan { free, pro }

class PlanFeatures {
  final List<AnonMode> modes;
  final bool watermark;
  final bool hd;
  final bool scrubBackground;
  final bool sceneScrub;
  final bool voice;
  final bool personas;

  const PlanFeatures({
    required this.modes,
    required this.watermark,
    required this.hd,
    required this.scrubBackground,
    required this.sceneScrub,
    required this.voice,
    required this.personas,
  });
}

const Map<Plan, PlanFeatures> plans = {
  Plan.free: PlanFeatures(
    modes: [AnonMode.blur],
    watermark: true,
    hd: false,
    scrubBackground: false,
    sceneScrub: false,
    voice: false,
    personas: false,
  ),
  Plan.pro: PlanFeatures(
    modes: [
      AnonMode.blur,
      AnonMode.pixelate,
      AnonMode.mask,
      AnonMode.silhouette,
      AnonMode.avatar,
    ],
    watermark: false,
    hd: true,
    scrubBackground: true,
    sceneScrub: true,
    voice: true,
    personas: true,
  ),
};

PlanFeatures features(Plan plan) => plans[plan]!;

bool canUseMode(Plan plan, AnonMode mode) => plans[plan]!.modes.contains(mode);

class GateResult {
  final AnonConfig config;
  final bool watermark;
  const GateResult(this.config, this.watermark);
}

/// Zoslabí požadovanú konfiguráciu na hranice plánu.
GateResult gateConfig(Plan plan, AnonConfig desired) {
  final f = plans[plan]!;
  final mode = f.modes.contains(desired.mode) ? desired.mode : f.modes.first;
  final config = desired.copyWith(
    mode: mode,
    scrubBackground:
        f.scrubBackground ? desired.scrubBackground : BackgroundScrub.off,
    sceneScrub: f.sceneScrub ? desired.sceneScrub : false,
  );
  return GateResult(config, f.watermark);
}
