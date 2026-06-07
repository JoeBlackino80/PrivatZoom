# ZÁVOJ — produktový plán & roadmapa

### Privacy video komunikácia — „buď prítomný, ostaň neidentifikovateľný”

> Living dokument. Stav značíme `[x]` hotové · `[~]` rozpracované · `[ ]` plánované.

---

## 1. Vízia & pozícia

Anonymizačný engine pre video a hlas, ktorý beží **on-device** na bežných
telefónoch a notebookoch. Necháva ťa byť na hovore prítomný a expresívny, ale
neidentifikovateľný — bez toho, aby si musel vypnúť kameru.

**Pre koho:** ľudia, ktorí nechcú ukazovať tvár pri online komunikácii (citlivé
hovory, podpora, zoznamky, terapia, ochrana zdrojov) + firmy, ktoré potrebujú
anonymitu ako súčasť vlastného produktu.

**Hlavný argument:** nič neopúšťa zariadenie. Súkromie nie je sľub na papieri,
je to architektúra.

---

## 2. Stratégia: B → A (postav jadro raz, predaj dvakrát)

1. **Engine** = samostatný prenosný modul, tvoj skutočný majetok.
2. **Vlastná appka** = výkladná skriňa nad engine + prvé tržby + referencia.
3. **SDK** = ten istý engine licencovaný ďalej firmám.

Appka robí marketing aj dôkaz pre B2B predaj. Bez nej sa SDK predáva ťažko.

---

## 3. Tech stack

| Vrstva              | Voľba                                                  | Prečo |
|---------------------|--------------------------------------------------------|-------|
| Shell appky         | **Flutter**                                            | jedna codebase: iOS, Android, desktop, web |
| Detekcia tváre      | **ML Kit** (Android) / **Vision** (iOS) / MediaPipe (web) | on-device, rýchle aj na strednej triede |
| Segmentácia pozadia | MediaPipe Selfie Segmentation / natívne                | scrub pozadia v reálnom čase |
| Efekty              | **GPU shadery** (Metal / OpenGL / WebGL fragment shaders) | 30 fps na bežnom telefóne |
| Avatar              | blendshapes riadené mimikou (typ Memoji)               | ľudský feel + nízka prenosová náročnosť |
| Hovory              | **LiveKit** (open-source, self-hosted)                 | E2EE, žiadne poplatky za minútu, vlastná infra |
| Účty / dáta         | **Supabase**                                           | už používaš |
| Platby              | **Stripe**                                             | už integruješ |
| Hlas                | pitch/formant on-device + konzistentný syntetický hlas | anonymizácia bez „robota” |

---

## 4. Kompletný zoznam funkcií

**Priorita:** `v1` = prvé vydanie · `v2` = krátko po · `later` = neskôr

### Anonymizácia obrazu
- `v1` `[x]` Režimy: **blur, pixely, maska, silueta, avatar**
- `v1` `[x]` **Zachovanie mimiky** — reálne reakcie a pohyb pier, identita nie
- `v1` `[x]` **Fail-safe clona** — keď tvár vypadne, zaclonení sa celý obraz
- `v1` `[x]` **Scrub pozadia** — blur alebo výmena prostredia
- `v2` `[x]` **Scrub scény** — auto-blur menoviek, dokumentov, obrazoviek, kódov/ŠPZ (engine `sceneScrub` + `ISceneDetector`; web cez Shape Detection API, mobil ML Kit; pure `blurBoxes` testovaný)
- `v1` `[x]` Viacero tvárí naraz (skupinová ochrana)

### Identita & persona
- `v1` `[~]` **Stabilná anonymná persona** — rovnaký avatar + hlas pri každom hovore (deterministický seed → profil; UI v appke)
- `v1` `[x]` **Reveal na tvoj príkaz** — začneš anonymne, tvár odhalíš keď ty chceš (hold-to-reveal; engine `setRevealed`, bypass detekcie, viditeľný LIVE badge)
- `v2` `[x]` **Viac person** — iná clona na rôzne kontexty (engine `PersonaBook`; web preset switcher; 11 testov)
- `v2` `[x]` **Per-kontakt nastavenie** — vždy anonymný voči X, reálny voči Y (`assign` / `REAL_PERSONA_ID`; UI v appke Fáza 2)

### Hlas & audio
- `v1` `[x]` **Anonymizácia hlasu** — pitch / formant
- `v1` `[x]` **Konzistentný syntetický profil** namiesto robotického skreslenia
- `v1` `[x]` **Potlačenie šumu** — kvalita + pozadie neprezradí, kde si (highpass/lowpass + getUserMedia noiseSuppression; toggle `setNoiseSuppression`)
- `v2` `[x]` **Voice-only režim** — kamera vyp., len zaclonený hlas (web toggle: vypne video track, audio beží ďalej)

### Dôvera & bezpečnosť
- `v1` `[ ]` **End-to-end šifrovanie** hovorov (LiveKit, Fáza 2)
- `v1` `[x]` **On-device indikátor** — viditeľné „0 bytov odoslaných”
- `v1` `[~]` **Efemérne defaultne** — žiadne nahrávky (politika engine, vynútené v appke)
- `v2` `[x]` **Open-source engine** — Apache-2.0, auditovateľnosť, ťahá adopciu SDK
- `v1` `[~]` **Low-bandwidth avatar mód** — zlomok dát oproti videu (avatar efekt hotový; transport v appke)

### Anti-abuse vrstva → `packages/safety` (testované, 25 testov)
- `v1` `[x]` **Report / block** — okamžité lokálne blokovanie + rate-limit reportov
- `v1` `[x]` **Indikátor súhlasu s nahrávaním** — efemérne defaultne, súhlas všetkých účastníkov
- `v1` `[x]` **Vekové brány** — self-attestation cez dátum narodenia, data minimization
- *(Nutné pre schválenie v store aj pre B2B klientov ako telemedicína.)*
- Napojené v web showcase (veková brána pri vstupe, consent indikátor, report/block).

### Komunikácia (appka) → `packages/rooms` (Fáza 2 skeleton, 22 testov)
- `v1` `[~]` **Link-based anonymné miestnosti** — bez účtu sa dá pripojiť (logika linkov + token hotová; transport LiveKit za `ICallTransport`)
- `v1` `[~]` 1:1 hovory — `RoomSession` stavový automat hotový; transport v appke
- `v2` `[x]` Jednorazové / časované linky — `createTimedLink` + `isLinkValid` (one-time/expiry), testované
- `v2` `[ ]` Anonymný textový chat v hovore
- `later` `[ ]` **Skupinové hovory**
- `later` `[ ]` **Screen share s auto-blurom** citlivého obsahu
- `later` `[ ]` **Živé titulky**

### SDK (B2B)
- `v3` `[ ]` Bindings: iOS / Android / Web
- `v3` `[ ]` Dokumentácia + ukážkové appky
- `v3` `[ ]` Konfigurovateľné politiky (force-on / user-choice)
- `v3` `[ ]` Compliance helpery — GDPR data-minimization

---

## 5. Roadmapa (orientačné odhady)

### Fáza 0 — Proof ✅
Web prototyp anonymizačného jadra (blur / pixely / maska / silueta + fail-safe).
→ **`packages/web` + `packages/engine`** v tomto repe.

### Fáza 1 — Engine · ~3–4 týždne
Flutter modul: kamera → ML Kit detekcia → segmentácia → shader efekty.
Funkcie: všetky obrazové `v1`, fail-safe, scrub pozadia, avatar, multi-face.
**Výstup:** prenosné jadro pripravené na vloženie do appky aj SDK.
→ Skeleton + port-guide v **`app/`**; kontrakt jadra zdieľaný cez `packages/engine`.

### Fáza 2 — Appka (B2C) · ~4–6 týždňov
LiveKit hovory, link-miestnosti, účty (Supabase), platby (Stripe), persony,
reveal, E2EE, on-device indikátor, efemérnosť, low-bandwidth avatar, **celá
anti-abuse vrstva**.

### Fáza 3 — SDK (B2B) · po stabilizácii appky
Engine vytiahnutý do knižnice, dokumentácia, ukážky, konfig. politiky, compliance.
→ Kontrakt a štruktúra v **`sdk/`**.

### Priebežne
Scrub scény, viac person, per-kontakt, voice-only, jednorazové linky, chat → `v2`.
Skupinové hovory, screen share, titulky → `later`.

---

## 6. Pricing & monetizácia

**B2C (appka)**
- **Free** — len blur + vodoznak
- **Pro ~4,99 €/mes** — všetky režimy, avatar, hlas, HD, scrub pozadia, persony

**SDK (B2B)**
- **Dev tier** — zadarmo na vývoj
- **Per-MAU** alebo **ročná licencia na appku** — pre produkčné nasadenie
- Cieľové vertikály: telemedicína, online terapia, linky pomoci, zoznamky,
  anonymné prvé kolá pohovorov, zákaznícka podpora cez video

---

## 7. Trust & safety / compliance

- Anonymita priťahuje zneužitie → anti-abuse vrstva je **podmienka**, nie doplnok.
- On-device + E2EE = silný GDPR príbeh (data minimization, žiadne biometrické
  dáta na server).
- Efemérnosť a žiadne nahrávky defaultne znižujú právne riziko aj záťaž.
- Pri store review jasne komunikovať: privacy/filter nástroj, nie nástroj na
  obchádzanie overovania identity.

---

## 8. Rozdelenie práce

**Claude (väčšina kódu):** kompletný kód engine, pipeline, UI, integrácie
(LiveKit, Supabase, Stripe, voice), architektúra, štruktúra SDK, dokumentácia.

**Ty (+ Mac + Claude Code):** build a beh na iOS/Android, developer účty,
podpisovanie, store, nasadenie LiveKit servera, ladenie výkonu na zariadeniach.

---

## 9. Riziká & poznámky

- **Mobilná virtuálna kamera neexistuje** → preto vlastná appka / SDK.
- **Ťažký „deepfake” GAN** nebeží real-time na bežnom telefóne → mass-market =
  blur/pixely/maska/avatar; ťažké modely len na desktope/serveri.
- Výkon na slabších telefónoch = hlavné riziko → shadery + avatar mód.
- Store review → anti-abuse vrstva a jasná komunikácia účelu.
