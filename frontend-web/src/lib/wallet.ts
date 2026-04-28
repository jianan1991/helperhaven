import { api } from './api';

export interface WalletView {
  balance: number;
  reserved: number;
}

export interface UnlockView {
  conversationId: string;
  counterpartyUserId: string;
  balanceAfter: number;
  charged: boolean;
}

export async function fetchWallet(): Promise<WalletView> {
  const { data } = await api.get<WalletView>('/wallet/me');
  return data;
}

/**
 * Open the chat with `counterpartyUserId` and burn 1 credit if this is the
 * caller's first unlock for that conversation. Idempotent — second click on
 * the same row returns `{ charged: false }`.
 */
export async function unlock(counterpartyUserId: string): Promise<UnlockView> {
  const { data } = await api.post<UnlockView>('/unlocks', { counterpartyUserId });
  return data;
}
