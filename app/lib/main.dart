/// ZÁVOJ — Flutter app shell (Fáza 1 skeleton).
///
/// Toto je výkladná skriňa nad engine: kamera preview + ovládanie clony.
/// Integračné body (ML Kit detekcia, segmentácia, GPU shadery, audio) sú
/// označené TODO a portujú sa z packages/engine. Build/beh na Macu.
import 'package:flutter/material.dart';

import 'engine/config.dart';
import 'engine/voice_profile.dart';

void main() => runApp(const ZavojApp());

class ZavojApp extends StatelessWidget {
  const ZavojApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ZÁVOJ',
      theme: ThemeData.dark(useMaterial3: true).copyWith(
        scaffoldBackgroundColor: const Color(0xFF0C0D12),
        colorScheme: const ColorScheme.dark(primary: Color(0xFF6EA8FE)),
      ),
      home: const CallScreen(),
    );
  }
}

class CallScreen extends StatefulWidget {
  const CallScreen({super.key});

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  AnonConfig _config = const AnonConfig();
  String _persona = 'zdroj-01';

  @override
  Widget build(BuildContext context) {
    final voice = personaProfile(_persona);
    return Scaffold(
      appBar: AppBar(
        title: const Text('🛡  ZÁVOJ'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: Center(
              child: Text('on-device · 0 bytov',
                  style: TextStyle(color: Color(0xFF36D399), fontSize: 13)),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // TODO Fáza 1: nahradiť CameraPreview + engine renderom (zaclonený výstup)
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              color: Colors.black,
              alignment: Alignment.center,
              child: const Text(
                'náhľad kamery (zaclonený)\nintegrácia: ML Kit + shadery',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white54),
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Režim clony'),
                Wrap(
                  spacing: 8,
                  children: AnonMode.values.map((m) {
                    return ChoiceChip(
                      label: Text(m.name),
                      selected: _config.mode == m,
                      onSelected: (_) =>
                          setState(() => _config = _config.copyWith(mode: m)),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                const Text('Sila efektu'),
                Slider(
                  value: _config.intensity,
                  onChanged: (v) =>
                      setState(() => _config = _config.copyWith(intensity: v)),
                ),
                SwitchListTile(
                  title: const Text('Fail-safe clona'),
                  subtitle: const Text('keď tvár vypadne, zaclonení sa celý obraz'),
                  value: _config.failSafe,
                  onChanged: (v) =>
                      setState(() => _config = _config.copyWith(failSafe: v)),
                ),
                const SizedBox(height: 8),
                Text(
                  'Persona „$_persona” → hlas pitch '
                  '${voice.pitchSemitones > 0 ? '+' : ''}${voice.pitchSemitones} pt · '
                  'formant ${voice.formantRatio}',
                  style: const TextStyle(color: Colors.white54, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
