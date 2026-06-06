/// Dart port of packages/engine/src/core/failsafe.ts.
/// Bezpečnostne kritické: keď tvár vypadne, nesmie prejsť odkrytý frame.
/// Hysterézia: clona sa zapne rýchlo, vypne opatrne.

class FailSafe {
  final int coverAfter;
  final int recoverAfter;

  bool _covered = true;
  int _missStreak = 0;
  int _hitStreak = 0;

  FailSafe({this.coverAfter = 2, this.recoverAfter = 5});

  /// Zaznamená detekciu pre jeden frame; vráti, či má byť obraz zaclonený.
  bool update(bool faceDetected) {
    if (faceDetected) {
      _hitStreak++;
      _missStreak = 0;
      if (_covered && _hitStreak >= recoverAfter) {
        _covered = false;
      }
    } else {
      _missStreak++;
      _hitStreak = 0;
      if (!_covered && _missStreak >= coverAfter) {
        _covered = true;
      }
    }
    return _covered;
  }

  bool get isCovered => _covered;

  void reset() {
    _covered = true;
    _missStreak = 0;
    _hitStreak = 0;
  }
}
