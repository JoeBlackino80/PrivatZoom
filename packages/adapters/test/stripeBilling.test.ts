import { describe, it, expect, vi } from 'vitest';
import { StripeBilling, type FetchLike } from '../src/stripeBilling.js';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('StripeBilling.startCheckout', () => {
  it('POSTuje na backend a vráti checkout URL', async () => {
    const fetchFn: FetchLike = vi.fn(async () =>
      jsonResponse({ url: 'https://checkout.stripe.com/abc' }),
    );
    const billing = new StripeBilling('https://api.zavoj.app/', fetchFn);
    const res = await billing.startCheckout('acc_1', 'pro');
    expect(res.url).toBe('https://checkout.stripe.com/abc');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.zavoj.app/checkout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('chyba backendu vyhodí výnimku', async () => {
    const fetchFn: FetchLike = async () => jsonResponse({}, false, 500);
    const billing = new StripeBilling('https://api.zavoj.app', fetchFn);
    await expect(billing.startCheckout('acc_1', 'pro')).rejects.toThrow(/HTTP 500/);
  });

  it('chýbajúca URL v odpovedi vyhodí výnimku', async () => {
    const fetchFn: FetchLike = async () => jsonResponse({});
    const billing = new StripeBilling('https://api.zavoj.app', fetchFn);
    await expect(billing.startCheckout('acc_1', 'pro')).rejects.toThrow(/checkout URL/);
  });
});

describe('StripeBilling.planFor', () => {
  it('vráti pro keď to backend potvrdí', async () => {
    const fetchFn: FetchLike = async () => jsonResponse({ plan: 'pro' });
    const billing = new StripeBilling('https://api.zavoj.app', fetchFn);
    expect(await billing.planFor('acc_1')).toBe('pro');
  });

  it('fail-safe: bez potvrdenia ostáva free', async () => {
    const fetchFn: FetchLike = async () => jsonResponse({}, false, 404);
    const billing = new StripeBilling('https://api.zavoj.app', fetchFn);
    expect(await billing.planFor('acc_1')).toBe('free');
  });

  it('neznámy plán degraduje na free', async () => {
    const fetchFn: FetchLike = async () => jsonResponse({ plan: 'enterprise' });
    const billing = new StripeBilling('https://api.zavoj.app', fetchFn);
    expect(await billing.planFor('acc_1')).toBe('free');
  });
});
