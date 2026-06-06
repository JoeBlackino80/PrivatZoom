# ZÁVOJ — Flutter appka (Fáza 1–2)

B2C výkladná skriňa nad engine. Jedna codebase: iOS, Android, desktop.

> **Build a beh = na tvojom Macu** (cez Claude Code build-run-debug slučku).
> Tento adresár je pripravený skeleton + port-guide; runtime kód jadra sa
> portuje z `packages/engine`.

---

## Štruktúra

```
app/
├── pubspec.yaml            # závislosti (camera, google_mlkit_face_detection, …)
├── lib/
│   ├── main.dart           # shell appky: kamera preview + ovládanie clony
│   └── engine/             # Dart port PURE jadra (1:1 z packages/engine/src/core)
│       ├── config.dart     # AnonConfig + normalizácia (port config.ts)
│       ├── failsafe.dart   # FailSafe FSM (port failsafe.ts)
│       └── voice_profile.dart  # deterministická persona (port audio.ts)
└── test/
    └── engine_test.dart    # tie isté testovacie vektory ako TS
```

## Prečo sa to portuje hladko

`packages/engine/src/core/*` je čistá, deterministická logika bez závislostí.
Dart port používa **tie isté testovacie vektory** ako TypeScript verzia —
keď prejdú v oboch, port je verný. Platform-specific časti (detekcia,
segmentácia, shadery, audio graf) sú za rozhraním a mapujú sa takto:

| Web (`packages/engine`)  | iOS                          | Android                       |
|--------------------------|------------------------------|-------------------------------|
| MediaPipe FaceDetector   | Vision face rectangles       | ML Kit Face Detection         |
| MediaPipe ImageSegmenter | Vision person segmentation   | MediaPipe Selfie Segmentation |
| WebGL fragment shader    | Metal shader                 | OpenGL ES / GLSL              |
| Web Audio pitch/formant  | AVAudioEngine + TimePitch    | Oboe / AudioEffect            |

Detaily v [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

---

## Build (na Macu)

```bash
cd app
flutter pub get
flutter run            # alebo: flutter run -d <device-id>
flutter test           # spustí Dart port testy jadra
```

### Integračné body (TODO Fáza 1)
- [ ] Kamera frame → ML Kit / Vision detekcia tváre → `FaceBox`
- [ ] Selfie segmentation → mask
- [ ] GPU shader pipeline (Metal/OpenGL) — efekty z `packages/engine/src/runtime/shaders.ts`
- [ ] Audio unit pitch/formant podľa `voice_profile.dart`
- [ ] On-device indikátor „0 bytov odoslaných”

### Fáza 2 (appka)
- [ ] LiveKit hovory (E2EE) + link-miestnosti
- [ ] Supabase účty, Stripe billing
- [ ] Persony, reveal-on-command
- [ ] Celá anti-abuse vrstva (report/block, súhlas s nahrávaním, vekové brány)
