# ZÁVOJ — Architektúra engine

Engine je **prenosné jadro** zdieľané medzi web showcase, Flutter appkou a SDK.
Tento dokument popisuje kontrakt, dátový tok a mapovanie web → mobil, aby sa
ten istý dizajn dal portovať bez prekvapení.

---

## 1. Dátový tok (jeden frame)

```
 camera frame (RGBA)                microphone block (Float32)
        │                                   │
        ▼                                   ▼
 ┌──────────────┐                    ┌──────────────┐
 │ FaceDetector │  boxes[]           │ VoiceAnon.   │  pitch/formant
 │ (on-device)  ├──────────┐         │ (Web Audio)  │  z persona profilu
 └──────────────┘          │         └──────┬───────┘
        │                  │                │
        ▼                  ▼                ▼
 ┌──────────────┐   ┌─────────────┐    anonymized audio out
 │ Segmenter    │   │ FailSafe FSM│
 │ (selfie mask)│   │ covered?    │
 └──────┬───────┘   └──────┬──────┘
        │ mask             │ covered
        ▼                  ▼
 ┌────────────────────────────────────┐
 │ EffectRenderer                      │
 │  mode: blur|pixelate|mask|          │
 │        silhouette|avatar            │
 │  + scrubBackground (blur|replace)   │
 │  + fail-safe full cover             │
 └──────────────┬─────────────────────┘
                ▼
        anonymized frame out  →  (lokálny náhľad + LiveKit track)

        Telemetria: bytesSent === 0  (on-device indikátor)
```

Kľúčové: **detekcia → segmentácia → efekt** je čistá funkcia stavu + vstupu.
Žiadny krok nevolá sieť. `bytesSent` je vždy 0; je to invariant, nie sľub.

---

## 2. Vrstvy a prečo sú oddelené

| Modul | Súbor | Čistota | Prečo oddelené |
|-------|-------|---------|----------------|
| Pixel core | `src/core/pixels.ts` | čisté funkcie nad `Uint8ClampedArray` | testovateľné bez GPU/kamery; zároveň CPU fallback |
| Audio core | `src/core/audio.ts` | čisté funkcie (pitch ratio, profil) | deterministická persona, unit-tested |
| Fail-safe | `src/core/failsafe.ts` | stavový automat s hysteréziou | bezpečnostne kritické → izolované a testované |
| Config | `src/core/config.ts` | validácia + normalizácia | jeden zdroj pravdy pre web/mobil/SDK |
| Detekcia | `src/runtime/faceDetector.ts` | wrapper nad MediaPipe | platform-specific, za rozhraním |
| Segmentácia | `src/runtime/segmenter.ts` | wrapper nad MediaPipe | platform-specific, za rozhraním |
| Efekty | `src/runtime/webglRenderer.ts` | WebGL fragment shadery | rýchla cesta (GPU); fallback = pixel core |
| Audio runtime | `src/runtime/voiceAnonymizer.ts` | Web Audio graf | platform-specific, za rozhraním |
| Orchestrátor | `src/anonymizer.ts` | spája runtime + core | verejné API engine |

**Pravidlo:** všetko v `src/core/` je čisté, deterministické a beží v Node →
testovateľné v CI bez prehliadača. Všetko v `src/runtime/` je platform-specific
a skryté za rozhraním, takže Flutter/SDK vymenia implementáciu, nie kontrakt.

---

## 3. Verejné API (kontrakt)

```ts
const engine = new VideoAnonymizer({
  mode: 'pixelate',
  intensity: 0.6,
  scrubBackground: 'blur',
  failSafe: true,
  multiFace: true,
});
await engine.init({ canvas, faceModelUrl, segModelUrl });

// na každý video frame:
engine.processFrame(videoElement);   // renderuje do canvasu
engine.getStats();                   // { bytesSent: 0, fps, faces, covered }

// hlas:
const voice = new VoiceAnonymizer(audioContext);
voice.applyProfile(personaProfile(seed));  // deterministický profil
const outNode = voice.connect(micStreamNode);
```

Rovnaký kontrakt sa mapuje na Flutter (`app/`): `FaceDetector`→ML Kit/Vision,
`Segmenter`→MediaPipe Selfie, `webglRenderer`→Metal/OpenGL shadery,
`VoiceAnonymizer`→natívny audio unit. `core/` sa portuje 1:1 (čistá logika).

---

## 4. Mapovanie web → mobil (Fáza 1 port)

| Web (`packages/engine`) | iOS | Android |
|-------------------------|-----|---------|
| MediaPipe FaceDetector  | Vision `VNDetectFaceRectangles` | ML Kit Face Detection |
| MediaPipe ImageSegmenter| Vision person segmentation | MediaPipe Selfie Segmentation |
| WebGL fragment shader   | Metal shader | OpenGL ES / GLSL |
| Web Audio pitch/formant | AVAudioEngine + AVAudioUnitTimePitch | Oboe / AudioEffect |
| `core/*` (čisté TS)     | port do Dart | port do Dart |

Pure `core/` logika je zámerne bez závislostí, takže port do Dartu je
mechanický a dá sa overiť rovnakými testovacími vektormi.

---

## 5. Invarianty súkromia (testovateľné)

1. `getStats().bytesSent === 0` počas celého spracovania.
2. Žiadny `core/` ani `runtime/` modul neimportuje `fetch`/`XMLHttpRequest`
   na video/audio dáta (modely sa načítajú raz pri `init`, dajú sa bundlovať).
3. Fail-safe: ak `framesWithoutFace > coverAfter`, `covered === true`
   skôr, než sa vyrenderuje akýkoľvek odkrytý frame.
