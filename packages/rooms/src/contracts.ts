/**
 * Kontrakty pre Fázu 2 integrácie. Implementácie (LiveKit, Supabase, Stripe)
 * sa pripoja v appke; tu definujeme rozhrania, aby bol zvyšok kódu testovateľný
 * a vymeniteľný (mock v testoch, reálne v produkcii).
 *
 * Engine produkuje zaclonený MediaStream → ten ide do transportu. Privacy
 * invariant ostáva: na transport ide LEN už zaclonený výstup.
 */
import type { Plan } from './billing.js';

// ---- Transport (LiveKit, E2EE) ----

export interface RemoteParticipant {
  id: string;
  displayName?: string;
}

export interface ICallTransport {
  /** Pripoj sa do miestnosti so zacloneným audio/video trackom. */
  connect(roomId: string, anonymizedStream: MediaStream): Promise<void>;
  disconnect(): Promise<void>;
  onParticipant(cb: (p: RemoteParticipant) => void): void;
  onRemoteTrack(cb: (p: RemoteParticipant, track: MediaStreamTrack) => void): void;
  /** E2EE je zapnuté? (mal by byť invariant pre ZÁVOJ hovory.) */
  readonly e2ee: boolean;
}

// ---- Účty (Supabase) ----

export interface Account {
  id: string;
  email?: string;
  plan: Plan;
}

export interface IAccountStore {
  current(): Promise<Account | null>;
  /** Anonymné pripojenie cez link bez účtu. */
  anonymousSession(roomId: string): Promise<Account>;
  signOut(): Promise<void>;
}

// ---- Platby (Stripe) ----

export interface IBillingProvider {
  /** Spusti checkout pre Pro a vráť URL na presmerovanie. */
  startCheckout(accountId: string, plan: Exclude<Plan, 'free'>): Promise<{ url: string }>;
  /** Aktuálny plán účtu (po webhooku zo Stripe). */
  planFor(accountId: string): Promise<Plan>;
}
