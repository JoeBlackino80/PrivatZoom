/**
 * RoomSession — stavový automat životného cyklu hovoru. Drží UI a transport
 * (LiveKit) v synchronizovanom, predvídateľnom stave. Prechody sú validované,
 * aby sa appka nedostala do nemožného stavu (napr. „connected” bez „join”).
 */

export type RoomState =
  | 'lobby'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended';

const TRANSITIONS: Record<RoomState, RoomState[]> = {
  lobby: ['connecting', 'ended'],
  connecting: ['connected', 'ended'],
  connected: ['reconnecting', 'ended'],
  reconnecting: ['connected', 'ended'],
  ended: [],
};

export type StateListener = (next: RoomState, prev: RoomState) => void;

export class RoomSession {
  private _state: RoomState = 'lobby';
  private listeners = new Set<StateListener>();

  constructor(public readonly roomId: string) {}

  get state(): RoomState {
    return this._state;
  }

  onChange(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Je prechod do `next` povolený zo súčasného stavu? */
  canTransition(next: RoomState): boolean {
    return TRANSITIONS[this._state].includes(next);
  }

  // ---- akcie (mapujú sa na transport eventy) ----
  join(): void {
    this.transition('connecting');
  }
  onConnected(): void {
    this.transition('connected');
  }
  onDropped(): void {
    this.transition('reconnecting');
  }
  onReconnected(): void {
    this.transition('connected');
  }
  leave(): void {
    this.transition('ended');
  }

  /** Je hovor aktívny (počítaná efemérnosť beží)? */
  get isLive(): boolean {
    return this._state === 'connected' || this._state === 'reconnecting';
  }

  private transition(next: RoomState): void {
    if (!this.canTransition(next)) {
      throw new Error(`ZÁVOJ: neplatný prechod ${this._state} → ${next}`);
    }
    const prev = this._state;
    this._state = next;
    for (const l of this.listeners) l(next, prev);
  }
}
