/**
 * @zavoj/adapters — konkrétne implementácie kontraktov z @zavoj/rooms.
 *
 *  - LiveKitTransport: E2EE hovory (ICallTransport)
 *  - SupabaseAccountStore: účty + anonymné session (IAccountStore)
 *  - StripeBilling: checkout cez backend (IBillingProvider)
 *
 * Wiring vyžaduje tvoje API kľúče a LiveKit server. Logika rooms ostáva
 * platform-agnostická; tieto adaptéry sú vymeniteľné (mock v testoch).
 */
export { LiveKitTransport } from './livekitTransport.js';
export type { LiveKitConfig } from './livekitTransport.js';
export { SupabaseAccountStore } from './supabaseAccounts.js';
export { StripeBilling } from './stripeBilling.js';
export type { FetchLike } from './stripeBilling.js';
