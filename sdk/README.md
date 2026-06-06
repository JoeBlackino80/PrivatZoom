# ZÁVOJ SDK (Fáza 3 — B2B)

Ten istý engine (`packages/engine`) licencovaný ďalej firmám. Appka je dôkaz;
SDK je produkt pre vertikály (telemedicína, terapia, linky pomoci, zoznamky,
anonymné prvé kolá pohovorov, video podpora).

> Fáza 3 sa otvára po stabilizácii appky. Tu je **kontrakt** a štruktúra, aby
> engine od začiatku rástol smerom k licencovateľnej knižnici.

---

## Čo SDK pridáva nad engine

| Vrstva | Súbor | Účel |
|--------|-------|------|
| Politiky | `src/policies.ts` | `force-on` / `user-choice` — integrátor vynúti anonymizáciu |
| Compliance | `src/compliance.ts` | GDPR data-minimization helpery, „žiadne biometrické dáta neopúšťajú zariadenie” |
| Bindings | (plán) | iOS / Android / Web wrappery nad jadrom |
| Dokumentácia | (plán) | quickstart + ukážkové appky |

## Princíp

Engine je open-source (Apache-2.0) → auditovateľnosť ťahá adopciu. SDK
licencuje **balík okolo** jadra: politiky, compliance, podporu, bindings a
distribúciu, nie samotný algoritmus.

## Pricing (orientačne)
- **Dev tier** — zadarmo na vývoj
- **Per-MAU** alebo **ročná licencia na appku** — produkčné nasadenie

Detaily: [../docs/ROADMAP.md](../docs/ROADMAP.md) (§ SDK, § Pricing).
