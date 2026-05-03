import { api } from './api';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'EXPIRED';

export interface OfferView {
  id: string;
  conversationId: string;
  createdByUserId: string;
  salarySgd: number;
  offDayPolicy: string | null;
  status: OfferStatus;
  parentOfferId: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface OfferRequest {
  salarySgd: number;
  offDayPolicy?: string | null;
}

export async function listOffers(conversationId: string): Promise<OfferView[]> {
  const { data } = await api.get<OfferView[]>(`/chats/${conversationId}/offers`);
  return data;
}

export async function createOffer(conversationId: string, req: OfferRequest): Promise<OfferView> {
  const { data } = await api.post<OfferView>(`/chats/${conversationId}/offers`, req);
  return data;
}

export async function acceptOffer(offerId: string): Promise<OfferView> {
  const { data } = await api.post<OfferView>(`/offers/${offerId}/accept`);
  return data;
}

export async function rejectOffer(offerId: string): Promise<OfferView> {
  const { data } = await api.post<OfferView>(`/offers/${offerId}/reject`);
  return data;
}

export async function counterOffer(offerId: string, req: OfferRequest): Promise<OfferView> {
  const { data } = await api.post<OfferView>(`/offers/${offerId}/counter`, req);
  return data;
}
