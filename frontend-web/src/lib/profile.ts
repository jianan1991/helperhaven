import { api } from './api';

// ---------- Types mirroring backend DTOs ----------

export type Nationality = 'IDN' | 'MMR' | 'PHL' | 'OTHER';
export type HousingType = 'HDB' | 'CONDO' | 'LANDED';

export interface FiveVector {
  infant: number;
  elderly: number;
  cooking: number;
  house: number;
  attitude: number;
}

export const ZERO_VECTOR: FiveVector = {
  infant: 0,
  elderly: 0,
  cooking: 0,
  house: 0,
  attitude: 0,
};

export const SKILL_KEYS: (keyof FiveVector)[] = [
  'infant',
  'elderly',
  'cooking',
  'house',
  'attitude',
];

export function vectorSum(v: FiveVector): number {
  return v.infant + v.elderly + v.cooking + v.house + v.attitude;
}

export interface LanguageProficiency {
  languageId: number;
  proficiency: number;
}

export interface WorkEntry {
  id: string;
  country: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  duties: string[];
  leftBecause: string;
}

export interface HelperProfile {
  userId: string;
  displayFirstName: string;
  fullName: string | null;
  nationality: Nationality;
  dateOfBirth: string; // ISO date
  yearsExperience: number;
  religion: string | null;
  maritalStatus: string | null;
  education: string | null;
  bio: string | null;
  heightCm: number | null;
  weightKg: number | null;
  willingLiveIn: boolean;
  comfortableWithChildren: boolean;
  comfortableWithPets: boolean;
  halal: boolean;
  allergies: string | null;
  expectedSalarySgd: number | null;
  availableFrom: string | null;
  currentLocation: string | null;
  offDayPolicy: string | null;
  photoUrl: string | null;
  skills: FiveVector;
  languages: LanguageProficiency[];
  availableForTransfer: boolean;
  transferAvailableFrom: string | null;
  workHistory: WorkEntry[];
}

export type HelperProfileRequest = Omit<
  HelperProfile,
  'userId' | 'availableForTransfer' | 'transferAvailableFrom'
>;

export interface EmployerProfile {
  userId: string;
  fullName: string | null;
  householdSize: number;
  numChildren: number;
  numElderly: number;
  hasPets: boolean;
  housing: HousingType;
  district: string | null;
  salaryOfferSgdMin: number | null;
  salaryOfferSgdMax: number | null;
  offDayPolicy: string | null;
  preferredLanguages: string[]; // kept for API compat, not shown in UI
  hiringPurpose: string | null;
  purposeTags: string[];
  weights: FiveVector;
}

export type EmployerProfileRequest = Omit<EmployerProfile, 'userId'>;

// ---------- Reference data ----------

export interface LanguageOption {
  id: number;
  isoCode: string;
  displayName: string;
}

export interface SkillOption {
  key: keyof FiveVector;
  label: string;
}

// ---------- Helper API calls ----------

/** GET helper profile, returns null on 404 (no profile yet) so wizards can detect "fresh" state. */
export async function fetchHelperProfile(): Promise<HelperProfile | null> {
  try {
    const { data } = await api.get<HelperProfile>('/profile/helper/me');
    return data;
  } catch (err: unknown) {
    if (isAxios404(err)) return null;
    throw err;
  }
}

export async function saveHelperProfile(req: HelperProfileRequest): Promise<HelperProfile> {
  const { data } = await api.post<HelperProfile>('/profile/helper', req);
  return data;
}

export async function fetchEmployerProfile(): Promise<EmployerProfile | null> {
  try {
    const { data } = await api.get<EmployerProfile>('/profile/employer/me');
    return data;
  } catch (err: unknown) {
    if (isAxios404(err)) return null;
    throw err;
  }
}

export async function saveEmployerProfile(req: EmployerProfileRequest): Promise<EmployerProfile> {
  const { data } = await api.post<EmployerProfile>('/profile/employer', req);
  return data;
}

export async function fetchLanguages(): Promise<LanguageOption[]> {
  const { data } = await api.get<LanguageOption[]>('/reference/languages');
  return data;
}

export async function fetchSkills(): Promise<SkillOption[]> {
  const { data } = await api.get<SkillOption[]>('/reference/skills');
  return data;
}

// ---------- Photo upload (presigned PUT, then return key) ----------

interface PresignedUpload {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
}

/**
 * Two-step upload: ask the backend for a presigned PUT URL, then PUT the file
 * bytes directly at S3/MinIO. Returns the storage key — that's what we send
 * back as `photoUrl` in the profile request. The backend mints a fresh signed
 * GET URL on every read, so we never persist short-lived URLs in the DB.
 */
export async function uploadProfilePhoto(file: File): Promise<string> {
  const { data } = await api.post<PresignedUpload>('/uploads/profile-photo', {
    contentType: file.type,
  });
  // Bypass the api instance — we don't want our Authorization header forwarded
  // to S3, and we don't want JSON Content-Type interception.
  const res = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Photo upload failed (${res.status})`);
  }
  return data.key;
}

// ---------- Matches ----------

export interface MatchView {
  counterpartyUserId: string;
  displayName: string;
  subtitle: string | null;
  age: number | null;
  yearsExperience: number | null;
  // Pre-unlock helper fields (always visible to employer)
  willingLiveIn: boolean | null;
  expectedSalarySgd: number | null;
  availableFrom: string | null;
  currentLocation: string | null;
  workHistory: WorkEntry[] | null;
  photoUrl: string | null;
  score: number;
  reasons: string[];
  scores: FiveVector;
  unlocked: boolean;
  interested: boolean;
  interestExpiresAt: string | null;
  // Bio: helper's bio or employer's hiring purpose
  bio: string | null;
  comfortableWithChildren: boolean | null;
  comfortableWithPets: boolean | null;
  halal: boolean | null;
  allergies: string | null;
  // Employer-specific fields (populated when a helper views a family match)
  householdSize: number | null;
  numChildren: number | null;
  numElderly: number | null;
  hasPets: boolean | null;
  district: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  offDayPolicy: string | null;
  preferredLanguages: string[];
  purposeTags: string[];
}

export async function fetchMatches(): Promise<MatchView[]> {
  const { data } = await api.get<MatchView[]>('/matches');
  return data;
}

export async function expressInterest(employerId: string): Promise<{ interested: boolean; interestExpiresAt: string }> {
  const { data } = await api.post<{ interested: boolean; interestExpiresAt: string }>(`/interests/${employerId}`);
  return data;
}

export async function withdrawInterest(employerId: string): Promise<void> {
  await api.delete(`/interests/${employerId}`);
}

// ---------- Helpers ----------

function isAxios404(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    (err as { response?: { status?: number } }).response?.status === 404
  );
}
