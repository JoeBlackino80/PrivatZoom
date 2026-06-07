# ZÁVOJ

**Privacy video komunikácia — „buď prítomný, ostaň neidentifikovateľný”.**

Anonymizačný engine pre video a hlas, ktorý beží **on-device** na bežných
telefónoch a notebookoch. Necháva ťa byť na hovore prítomný a expresívny, ale
neidentifikovateľný — bez toho, aby si musel vypnúť kameru. Nič neopúšťa
zariadenie. **Súkromie nie je sľub na papieri, je to architektúra.**

---

## Stratégia: B → A (postav jadro raz, predaj dvakrát)

```
┌─────────────────────────────────────────────────────┐
│  ENGINE (jadro — zdieľané všade)                      │
│  vstup: video/audio frame                              │
│  → detekcia tváre (on-device ML)                       │
│  → segmentácia pozadia                                  │
│  → GPU efekt (blur / pixely / maska / silueta / avatar) │
│  → anonymizácia hlasu                                   │
│  výstup: zaclonený frame + audio                       │
└───────────────┬─────────────────────────────────────-─┘
                │
   ┌────────────┴────────────┐
   │                         │
┌──▼─── App (B2C) ───┐   ┌────▼──── SDK (B2B) ────┐
│ LiveKit hovory      │   │ iOS / Android / Web     │
│ účty, billing       │   │ bindings + dokumentácia │
│ persony, reveal     │   │ konfig. politiky        │
└─────────────────────┘   └─────────────────────────┘
```

1. **Engine** = samostatný prenosný modul, skutočný majetok.
2. **Appka** = výkladná skriňa nad engine + prvé tržby + referencia.
3. **SDK** = ten istý engine licencovaný ďalej firmám.

---

## Štruktúra repozitára

| Cesta              | Fáza | Čo to je |
|--------------------|------|----------|
| `packages/engine`  | 1    | Prenosné anonymizačné jadro (TypeScript). Pure pixel/audio core + WebGL efekty + on-device ML wrapper. **Toto je majetok.** |
| `packages/web`     | 0    | Spustiteľná web showcase nad engine — proof, marketing aj manuálny test (kamera → efekty → 0 bytov odoslaných). |
| `app/`             | 1–2  | Flutter B2C appka (skeleton + plán). Build na zariadení = lokálne cez Mac. |
| `sdk/`             | 3    | Štruktúra a kontrakt SDK pre B2B licencovanie. |
| `docs/`            | —    | [ROADMAP.md](docs/ROADMAP.md) · [ARCHITECTURE.md](docs/ARCHITECTURE.md) |

---

## Rýchly štart (web showcase + engine)

```bash
npm install
npm test          # unit testy pure jadra (pixely, audio, fail-safe, config)
npm run dev       # spustí web showcase na http://localhost:5173
npm run build     # build engine + web
```

> Web showcase potrebuje kameru a beží v prehliadači na **tvojom** stroji.
> V cloud/CI prostredí spusti `npm test` a `npm run build` — overia jadro bez kamery.

---

## Princípy

- **On-device spracovanie** — žiadny video/audio frame neopúšťa zariadenie.
- **E2EE hovory** (appka, Fáza 2 cez LiveKit).
- **Efemérne defaultne** — žiadne nahrávky.
- **Open-source engine** — auditovateľnosť ťahá adopciu SDK.
- **Fail-safe** — keď detekcia tváre vypadne, zaclonení sa celý obraz.

---

## Stav (Fáza 0/1)

- [x] Pure anonymizačné jadro: pixelate, box-blur, silueta, mask composite — **unit-tested**
- [x] WebGL renderer (blur / pixely / maska / silueta / avatar) — 30 fps cieľ
- [x] On-device detekcia tváre + segmentácia pozadia (MediaPipe Tasks Vision)
- [x] Fail-safe clona (state machine s hysteréziou) — **unit-tested**
- [x] Anonymizácia hlasu (Web Audio pitch/formant) + konzistentný profil — **unit-tested**
- [x] Reveal-on-command (hold-to-reveal, bypass detekcie) — **unit-tested**
- [x] Potlačenie šumu + voice-only režim (kamera vyp., len hlas)
- [x] On-device indikátor „0 bytov odoslaných”
- [x] Web showcase (proof + manuálny test)
- [ ] Flutter port jadra (Fáza 1) — skeleton pripravený v `app/`
- [ ] LiveKit hovory, persony, billing (Fáza 2)
- [ ] SDK bindings + compliance (Fáza 3)

Detailná roadmapa: [docs/ROADMAP.md](docs/ROADMAP.md).
