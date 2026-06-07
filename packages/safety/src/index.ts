/**
 * @zavoj/safety — anti-abuse vrstva. Prenosná, testovateľná logika zdieľaná
 * appkou (B2C) aj SDK (B2B). Anonymita priťahuje zneužitie → toto je podmienka,
 * nie doplnok.
 *
 *  - AgeGate: vekové brány (self-attestation, data minimization)
 *  - RecordingConsent: súhlas s nahrávaním (efemérne defaultne, súhlas všetkých)
 *  - Moderation: report / block (okamžité blokovanie, rate-limit reportov)
 */
export * from './ageGate.js';
export * from './consent.js';
export * from './moderation.js';
