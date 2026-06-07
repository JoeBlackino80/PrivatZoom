/**
 * Supabase implementácia IAccountStore — účty, anonymné session cez link.
 * Plán sa drží v tabuľke `profiles(id, plan)`.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Account, IAccountStore, Plan } from '@zavoj/rooms';

export class SupabaseAccountStore implements IAccountStore {
  private readonly sb: SupabaseClient;

  constructor(url: string, anonKey: string, client?: SupabaseClient) {
    this.sb = client ?? createClient(url, anonKey);
  }

  async current(): Promise<Account | null> {
    const {
      data: { user },
    } = await this.sb.auth.getUser();
    if (!user) return null;
    const plan = await this.fetchPlan(user.id);
    return user.email ? { id: user.id, email: user.email, plan } : { id: user.id, plan };
  }

  /** Anonymné pripojenie cez link — žiadny e-mail, len efemérna identita. */
  async anonymousSession(_roomId: string): Promise<Account> {
    const { data, error } = await this.sb.auth.signInAnonymously();
    if (error || !data.user) {
      throw new Error(`ZÁVOJ: anonymné prihlásenie zlyhalo: ${error?.message ?? 'neznáme'}`);
    }
    return { id: data.user.id, plan: 'free' };
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  private async fetchPlan(userId: string): Promise<Plan> {
    const { data } = await this.sb
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();
    return (data?.plan as Plan) ?? 'free';
  }
}
