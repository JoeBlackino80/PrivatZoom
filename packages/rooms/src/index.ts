/**
 * @zavoj/rooms — Fáza 2 skeleton (B2C hovory).
 *
 *  - links: link-based anonymné miestnosti (jednorazové / časované)
 *  - billing: plan gating (free/pro) nad engine konfiguráciou
 *  - session: stavový automat hovoru
 *  - contracts: rozhrania pre LiveKit / Supabase / Stripe (implementácia v appke)
 *
 * Testovateľná, prenosná logika; integrácie sú za rozhraním.
 */
export * from './links.js';
export * from './billing.js';
export * from './session.js';
export * from './contracts.js';
