import { api } from './api';

export type EngagementMode = 'JWC' | 'DIY';

export type PlacementStatus =
  | 'INITIATED'
  | 'DOCS_COLLECTION'
  | 'MOM_ACKNOWLEDGE'
  | 'MOM_SUBMITTED'
  | 'IPA_ISSUED'
  | 'HELPER_ARRIVAL'
  | 'ACTIVE'
  | 'TERMINATED';

export interface SelectedService {
  id: string;
  icon: string;
  title: string;
  priceSgd: number;
  workflowStage: string | null;
}

export async function setMemberDocCount(placementId: string, memberDocCount: number): Promise<PlacementView> {
  const { data } = await api.put<PlacementView>(`/placements/${placementId}/member-count`, { memberDocCount });
  return data;
}

export interface PlacementView {
  id: string;
  offerId: string;
  employerId: string;
  helperId: string;
  engagementMode: EngagementMode;
  status: PlacementStatus;
  helperDisplayName: string;
  helperPhotoUrl: string | null;
  employerDisplayName: string | null;
  employerDocsSubmittedAt: string | null;
  helperDocsSubmittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  selectedServices: SelectedService[];
  idealStartDate: string | null;
  memberDocCount: number;
}

export const PLACEMENT_STEPS: { key: PlacementStatus; label: string }[] = [
  { key: 'INITIATED',        label: 'New' },
  { key: 'DOCS_COLLECTION',  label: 'Documents' },
  { key: 'MOM_ACKNOWLEDGE',  label: 'MOM Acknowledge' },
  { key: 'MOM_SUBMITTED',    label: 'MOM Application' },
  { key: 'IPA_ISSUED',       label: 'IPA Issued' },
  { key: 'HELPER_ARRIVAL',   label: 'Arrival' },
  { key: 'ACTIVE',           label: 'Active' },
];

export async function listPlacements(): Promise<PlacementView[]> {
  const { data } = await api.get<PlacementView[]>('/placements');
  return data;
}

export type PlacementDocType = 'NRIC_FRONT' | 'NRIC_BACK' | 'NOA' | 'PASSPORT' | string;

export interface PlacementDocumentView {
  id: string;
  docType: PlacementDocType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByRole: 'EMPLOYER' | 'HELPER';
  viewUrl: string | null;
}

export async function fetchPlacementDocuments(placementId: string): Promise<PlacementDocumentView[]> {
  const { data } = await api.get<PlacementDocumentView[]>(`/placements/${placementId}/documents`);
  return data;
}

export async function submitPlacementDocuments(
  placementId: string,
): Promise<{ status: string; employerDocsSubmittedAt: string }> {
  const { data } = await api.post<{ status: string; employerDocsSubmittedAt: string }>(
    `/placements/${placementId}/documents/submit`,
  );
  return data;
}

export async function submitHelperDocuments(
  placementId: string,
): Promise<{ status: string; helperDocsSubmittedAt: string }> {
  const { data } = await api.post<{ status: string; helperDocsSubmittedAt: string }>(
    `/placements/${placementId}/documents/helper-submit`,
  );
  return data;
}

export async function uploadPlacementDocument(
  placementId: string,
  docType: PlacementDocType,
  file: File,
): Promise<PlacementDocumentView> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post<PlacementDocumentView>(
    `/placements/${placementId}/documents/${docType}`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function setIdealStartDate(placementId: string, idealStartDate: string): Promise<PlacementView> {
  const { data } = await api.put<PlacementView>(`/placements/${placementId}/ideal-start-date`, { idealStartDate });
  return data;
}

export async function createPlacement(
  offerId: string,
  mode: EngagementMode,
  selectedServiceIds: string[],
  idealStartDate?: string | null,
): Promise<PlacementView> {
  // Send mode as query param (old backend) AND in body (new backend) for compatibility.
  const { data } = await api.post<PlacementView>(
    `/placements/from-offer/${offerId}?mode=${mode}`,
    { mode, selectedServiceIds, idealStartDate: idealStartDate ?? null },
  );
  return data;
}
