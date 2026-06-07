/// Dart port of packages/engine/src/core/personas.ts.
/// Viac person + per-kontakt. Rovnaký kontrakt a testovacie vektory ako TS.
import 'config.dart';
import 'voice_profile.dart';

/// Špeciálna persona: voči tomuto kontaktu si vždy reálny (žiadna clona).
const String realPersonaId = '__real__';

class Persona {
  final String id;
  final String label;
  final String seed;
  final AnonConfig config;

  const Persona({
    required this.id,
    required this.label,
    required this.seed,
    this.config = const AnonConfig(),
  });
}

/// Kniha person + mapovanie kontaktov. Vždy existuje aspoň jedna persona a
/// default, takže [resolve] nikdy nevráti null.
class PersonaBook {
  final Map<String, Persona> _personas = {};
  final Map<String, String> _contacts = {}; // contactId → personaId
  String _defaultId;

  PersonaBook(List<Persona> initial) : _defaultId = _requireFirst(initial) {
    for (final p in initial) {
      _personas[p.id] = p;
    }
  }

  static String _requireFirst(List<Persona> initial) {
    if (initial.isEmpty) {
      throw ArgumentError('ZÁVOJ: PersonaBook vyžaduje aspoň jednu personu.');
    }
    return initial.first.id;
  }

  List<Persona> list() => _personas.values.toList();

  Persona? get(String id) => _personas[id];

  void add(Persona persona) => _personas[persona.id] = persona;

  void remove(String id) {
    if (id == _defaultId) {
      throw ArgumentError(
          'ZÁVOJ: nemožno odstrániť default personu (najprv zmeň default).');
    }
    _personas.remove(id);
    _contacts.removeWhere((_, personaId) => personaId == id);
  }

  void setDefault(String id) {
    if (!_personas.containsKey(id)) {
      throw ArgumentError('ZÁVOJ: neznáma persona "$id".');
    }
    _defaultId = id;
  }

  Persona getDefault() => _personas[_defaultId]!;

  void assign(String contactId, String personaId) {
    if (personaId != realPersonaId && !_personas.containsKey(personaId)) {
      throw ArgumentError('ZÁVOJ: neznáma persona "$personaId".');
    }
    _contacts[contactId] = personaId;
  }

  void unassign(String contactId) => _contacts.remove(contactId);

  bool isRealFor(String contactId) => _contacts[contactId] == realPersonaId;

  Persona resolve([String? contactId]) {
    if (contactId != null) {
      final assigned = _contacts[contactId];
      if (assigned != null && assigned != realPersonaId) {
        final p = _personas[assigned];
        if (p != null) return p;
      }
    }
    return getDefault();
  }

  VoiceProfile voiceFor([String? contactId]) =>
      personaProfile(resolve(contactId).seed);
}
