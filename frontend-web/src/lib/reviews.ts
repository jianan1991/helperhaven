import { api } from './api';

// ---------- Types mirroring backend DTOs ----------

export type ReviewKind = 'EMPLOYER_ON_HELPER' | 'HELPER_ON_EMPLOYER';
export type ReviewVisibility = 'PUBLIC' | 'PRIVATE' | 'ADMIN_ONLY';
export type EnglishLevel = 'NONE' | 'BASIC' | 'CONVERSATIONAL' | 'FLUENT';

export type PermitStatus =
  | 'DRAFT'
  | 'DOCS_PENDING'
  | 'SUBMITTED_MOM'
  | 'INTERIM_APPROVED'
  | 'BOND_INSURANCE'
  | 'IPA_ISSUED'
  | 'AWAITING_ARRIVAL'
  | 'ARRIVED'
  | 'SIP_DONE'
  | 'MEDICAL_DONE'
  | 'BIOMETRICS_DONE'
  | 'CARD_ISSUED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'TERMINATED_EARLY_PENDING'
  | 'TERMINATED_EARLY_CLOSED'
  | 'TRANSFER_PENDING'
  | 'TRANSFER_CLOSED';

export interface PermitCaseView {
  id: string;
  employerUserId: string;
  helperUserId: string;
  status: PermitStatus;
  reviewsUnlocked: boolean;
}

export interface ReviewView {
  id: string;
  reviewerUserId: string;
  reviewerName: string;
  reviewerPhotoUrl: string | null;
  revieweeUserId: string;
  kind: ReviewKind | null;
  visibility: ReviewVisibility;
  rating: number;
  body: string | null;
  skillBreakdown: Record<string, number> | null;
  flagTags: string[];
  englishLevel: EnglishLevel | null;
  monthsIntoContract: number | null;
  createdAt: string; // ISO-8601
}

export interface WriteReviewInput {
  revieweeUserId: string;
  rating: number;
  body?: string | null;
  skillBreakdown?: Record<string, number> | null;
  flagTags?: string[];
  englishLevel?: EnglishLevel | null;
  monthsIntoContract?: number | null;
}

export const FLAG_TAGS = [
  'punctual',
  'honest',
  'patient',
  'kind_to_elderly',
  'willing_to_learn',
] as const;

export const FLAG_TAG_LABELS: Record<string, string> = {
  punctual: 'Punctual',
  honest: 'Honest',
  patient: 'Patient',
  kind_to_elderly: 'Kind to elderly',
  willing_to_learn: 'Willing to learn',
};

// ---------- API ----------

/**
 * Demo-only: fast-forward the permit case for (currentUser, counterparty) to
 * status=CARD_ISSUED. The real concierge wizard lands in Sprint C.
 */
export async function demoMarkHired(counterpartyUserId: string): Promise<PermitCaseView> {
  const { data } = await api.post<PermitCaseView>('/permits/demo-mark-hired', {
    counterpartyUserId,
  });
  return data;
}

/** Returns null if no permit case exists with that counterparty yet. */
export async function getPermitWith(counterpartyUserId: string): Promise<PermitCaseView | null> {
  const { data } = await api.get<PermitCaseView | null>(`/permits/with/${counterpartyUserId}`);
  return data;
}

export async function writeReview(input: WriteReviewInput): Promise<ReviewView> {
  const { data } = await api.post<ReviewView>('/reviews', input);
  return data;
}

export async function fetchReviewsOf(userId: string): Promise<ReviewView[]> {
  const { data } = await api.get<ReviewView[]>(`/reviews/of/${userId}`);
  return data;
}

export async function fetchMyReceivedReviews(): Promise<ReviewView[]> {
  const { data } = await api.get<ReviewView[]>('/reviews/me');
  return data;
}
