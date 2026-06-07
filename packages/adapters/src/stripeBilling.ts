/**
 * Stripe implementácia IBillingProvider. Stripe secret žije na serveri —
 * klient len volá tvoj backend, ktorý vytvorí Checkout Session a vráti URL.
 *
 * `fetchFn` je injektovateľný → testovateľné bez siete.
 */
import type { IBillingProvider, Plan } from '@zavoj/rooms';

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export class StripeBilling implements IBillingProvider {
  constructor(
    private readonly apiBase: string,
    private readonly fetchFn: FetchLike = fetch as unknown as FetchLike,
  ) {}

  async startCheckout(
    accountId: string,
    plan: Exclude<Plan, 'free'>,
  ): Promise<{ url: string }> {
    const res = await this.fetchFn(`${this.base()}/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accountId, plan }),
    });
    if (!res.ok) {
      throw new Error(`ZÁVOJ: checkout zlyhal (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { url?: string };
    if (!data.url) throw new Error('ZÁVOJ: backend nevrátil checkout URL');
    return { url: data.url };
  }

  async planFor(accountId: string): Promise<Plan> {
    const res = await this.fetchFn(
      `${this.base()}/plan?account=${encodeURIComponent(accountId)}`,
    );
    if (!res.ok) return 'free'; // fail-safe: bez potvrdenia Pro ostáva free
    const data = (await res.json()) as { plan?: Plan };
    return data.plan === 'pro' ? 'pro' : 'free';
  }

  private base(): string {
    return this.apiBase.replace(/\/$/, '');
  }
}
