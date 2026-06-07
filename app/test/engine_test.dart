/// Dart port testy — TIE ISTÉ vektory ako TypeScript jadro
/// (packages/engine/test). Keď prejdú v oboch, port je verný.
import 'package:flutter_test/flutter_test.dart';
import 'package:zavoj/engine/config.dart';
import 'package:zavoj/engine/failsafe.dart';
import 'package:zavoj/engine/voice_profile.dart';
import 'package:zavoj/engine/personas.dart';
import 'package:zavoj/engine/billing.dart';

void main() {
  group('config', () {
    test('clampDouble oreže rozsah a NaN', () {
      expect(clampDouble(-1, 0, 1), 0);
      expect(clampDouble(2, 0, 1), 1);
      expect(clampDouble(double.nan, 0, 1), 0);
    });
    test('intensity mapovania sú monotónne', () {
      expect(intensityToBlockSize(0) < intensityToBlockSize(1), true);
      expect(intensityToBlurRadius(0) < intensityToBlurRadius(1), true);
    });
  });

  group('FailSafe', () {
    test('štartuje zaclonený', () {
      expect(FailSafe().isCovered, true);
    });
    test('odclonení až po recoverAfter detekciách', () {
      final fs = FailSafe(coverAfter: 2, recoverAfter: 3);
      expect(fs.update(true), true);
      expect(fs.update(true), true);
      expect(fs.update(true), false);
    });
    test('zaclonení po coverAfter výpadkoch', () {
      final fs = FailSafe(coverAfter: 2, recoverAfter: 3);
      fs.update(true);
      fs.update(true);
      fs.update(true); // odclonené
      expect(fs.update(false), false);
      expect(fs.update(false), true);
    });
  });

  group('persona', () {
    test('hashSeed deterministický a 32-bit', () {
      expect(hashSeed('zavoj'), hashSeed('zavoj'));
      expect(hashSeed('a') != hashSeed('b'), true);
    });
    test('profil v ľudských rozsahoch', () {
      for (final seed in ['a', 'bob', 'persona-42', 'zdroj']) {
        final p = personaProfile(seed);
        expect(p.pitchSemitones >= -5 && p.pitchSemitones <= 5, true);
        expect(p.formantRatio >= 0.8 && p.formantRatio <= 1.25, true);
        expect(p.detuneCents >= -25 && p.detuneCents <= 25, true);
      }
    });
    test('rovnaký seed → rovnaký profil', () {
      final a = personaProfile('alice');
      final b = personaProfile('alice');
      expect(a.pitchSemitones, b.pitchSemitones);
      expect(a.formantRatio, b.formantRatio);
      expect(a.detuneCents, b.detuneCents);
    });
  });

  group('PersonaBook', () {
    PersonaBook book() => PersonaBook(const [
          Persona(id: 'anon', label: 'Anonym', seed: 'anon-1'),
          Persona(id: 'work', label: 'Práca', seed: 'work-1'),
        ]);

    test('prvá persona je default a resolve bez kontaktu ju vráti', () {
      expect(book().getDefault().id, 'anon');
      expect(book().resolve().id, 'anon');
    });
    test('per-kontakt priradenie prebije default', () {
      final b = book();
      b.assign('bob', 'work');
      expect(b.resolve('bob').id, 'work');
      expect(b.resolve('alice').id, 'anon');
    });
    test('„vždy reálny voči X”', () {
      final b = book();
      b.assign('mama', realPersonaId);
      expect(b.isRealFor('mama'), true);
      expect(b.resolve('mama').id, 'anon');
    });
    test('hlas je deterministický podľa seedu persony', () {
      final b = book();
      b.assign('bob', 'work');
      final v = b.voiceFor('bob');
      final ref = personaProfile('work-1');
      expect(v.pitchSemitones, ref.pitchSemitones);
      expect(v.formantRatio, ref.formantRatio);
    });
    test('default personu nemožno odstrániť', () {
      expect(() => book().remove('anon'), throwsArgumentError);
    });
  });

  group('billing plan gating', () {
    test('free zoslabí avatar na blur a zapne vodoznak', () {
      final res = gateConfig(
        Plan.free,
        const AnonConfig(mode: AnonMode.avatar, sceneScrub: true),
      );
      expect(res.config.mode, AnonMode.blur);
      expect(res.config.sceneScrub, false);
      expect(res.watermark, true);
    });
    test('pro ponechá voľby bez vodoznaku', () {
      final res = gateConfig(
        Plan.pro,
        const AnonConfig(mode: AnonMode.avatar, sceneScrub: true),
      );
      expect(res.config.mode, AnonMode.avatar);
      expect(res.config.sceneScrub, true);
      expect(res.watermark, false);
    });
    test('canUseMode rešpektuje plán', () {
      expect(canUseMode(Plan.free, AnonMode.avatar), false);
      expect(canUseMode(Plan.pro, AnonMode.avatar), true);
    });
  });
}
