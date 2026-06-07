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
| `packages/safety`  | 1    | Anti-abuse vrstva (vekové brány, súhlas s nahrávaním, report/block). Prenosná, testovaná. **Podmienka** pre store aj B2B. |
| `packages/rooms`   | 2    | Fáza 2 skeleton: link-miestnosti, plan gating (free/pro), session state, kontrakty pre LiveKit/Supabase/Stripe. |
| `packages/adapters`| 2    | Konkrétne implementácie kontraktov: **LiveKit** (E2EE transport), **Supabase** (účty), **Stripe** (platby). Wiring = tvoje kľúče + server. |
| `sdk/`             | 3    | `@zavoj/sdk` — politiky, compliance helpery (GDPR), bindings kontrakt pre B2B licencovanie. |
| `packages/web`     | 0    | Spustiteľná web showcase nad engine — proof, marketing aj manuálny test (kamera → efekty → 0 bytov odoslaných). |
| `app/`             | 1–2  | Flutter B2C appka (skeleton + Dart port jadra). Build na zariadení = lokálne cez Mac. |
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
- [x] Anti-abuse vrstva: vekové brány, súhlas s nahrávaním, report/block — **unit-tested**
- [x] Scrub scény (auto-blur menoviek/dokumentov/obrazoviek) + viac person + per-kontakt — **unit-tested**
- [x] On-device indikátor „0 bytov odoslaných”
- [x] Web showcase (proof + manuálny test)
- [x] Fáza 2 skeleton (`packages/rooms`): link-miestnosti, plan gating, session — **unit-tested**
- [x] LiveKit/Supabase/Stripe adaptéry (`packages/adapters`) — typecheck voči reálnym SDK, Stripe **unit-tested**
- [x] SDK (`@zavoj/sdk`): politiky, compliance helpery (GDPR), bindings kontrakt — **unit-tested**
- [x] Flutter Dart port jadra (config, fail-safe, persona, PersonaBook, plan gating) — rovnaké testovacie vektory ako TS
- [ ] Fáza 2 produkčné napojenie (LiveKit server na infre, Supabase/Stripe kľúče)
- [ ] Build na iOS/Android (Mac) + store
- [ ] SDK bindings iOS/Android/Web implementácia

Detailná roadmapa: [docs/ROADMAP.md](docs/ROADMAP.md).
