import { api } from './api';

export interface AdminStats {
  totalUsers: number;
  employers: number;
  helpers: number;
  conversations: number;
  placements: number;
  helperProfiles: number;
  employerProfiles: number;
}

export interface AdminUser {
  id: string;
  email: string;
  phoneE164: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: boolean;
}

export interface AdminConversation {
  id: string;
  userAId: string;
  userAEmail: string;
  userADisplayName: string;
  userARole: string;
  userBId: string;
  userBEmail: string;
  userBDisplayName: string;
  userBRole: string;
  status: string;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
}

export interface AdminSelectedService {
  id: string;
  icon: string;
  title: string;
  priceSgd: number;
  workflowStage: string | null;
}

export interface AdminPlacement {
  id: string;
  employerId: string;
  employerEmail: string;
  employerName: string;
  helperId: string;
  helperEmail: string;
  helperName: string;
  engagementMode: string;
  status: string;
  employerDocsSubmittedAt: string | null;
  helperDocsSubmittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  selectedServices: AdminSelectedService[];
}

export interface AdminHelper {
  userId: string;
  email: string;
  displayFirstName: string | null;
  fullName: string | null;
  nationality: string | null;
  yearsExperience: number | null;
  expectedSalarySgd: number | null;
  currentLocation: string | null;
  availableFrom: string | null;
  willingLiveIn: boolean;
  availableForTransfer: boolean;
  status: string;
  photoUrl: string | null;
}

export interface AdminEmployer {
  userId: string;
  email: string;
  fullName: string | null;
  housing: string | null;
  district: string | null;
  householdSize: number | null;
  numChildren: number | null;
  numElderly: number | null;
  hasPets: boolean | null;
  salaryOfferSgdMin: number | null;
  salaryOfferSgdMax: number | null;
  hiringPurpose: string | null;
  status: string;
}

export interface AdminMessage {
  id: string;
  senderUserId: string;
  senderEmail: string;
  senderDisplayName: string;
  body: string;
  hidden: boolean;
  sentAt: string;
}

export const fetchAdminStats = () =>
  api.get<AdminStats>('/admin/stats').then((r) => r.data);

export const fetchAdminUsers = () =>
  api.get<AdminUser[]>('/admin/users').then((r) => r.data);

export const fetchAdminConversations = () =>
  api.get<AdminConversation[]>('/admin/conversations').then((r) => r.data);

export const fetchAdminPlacements = () =>
  api.get<AdminPlacement[]>('/admin/placements').then((r) => r.data);

export const fetchAdminHelpers = () =>
  api.get<AdminHelper[]>('/admin/helpers').then((r) => r.data);

export const fetchAdminEmployers = () =>
  api.get<AdminEmployer[]>('/admin/employers').then((r) => r.data);

export const fetchAdminMessages = (conversationId: string) =>
  api.get<AdminMessage[]>(`/admin/conversations/${conversationId}/messages`).then((r) => r.data);

export const setUserStatus = (userId: string, status: string) =>
  api.put<AdminUser>(`/admin/users/${userId}/status`, { status }).then((r) => r.data);

export const toggleMessageHidden = (messageId: string) =>
  api.post<AdminMessage>(`/admin/messages/${messageId}/hide`).then((r) => r.data);

export const sendAdminMessage = (conversationId: string, body: string) =>
  api.post<AdminMessage>(`/admin/conversations/${conversationId}/messages`, { body }).then((r) => r.data);

export const updateAdminPlacementStatus = (placementId: string, status: string) =>
  api.put<AdminPlacement>(`/admin/placements/${placementId}/status`, { status }).then((r) => r.data);

export interface AdminPlacementDocument {
  id: string;
  docType: 'NRIC_FRONT' | 'NRIC_BACK' | 'NOA' | 'PASSPORT';
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByRole: 'EMPLOYER' | 'HELPER';
  viewUrl: string | null;
}

export const fetchPlacementDocuments = (placementId: string) =>
  api.get<AdminPlacementDocument[]>(`/placements/${placementId}/documents`).then((r) => r.data);

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  relatedPlacementId: string | null;
  readAt: string | null;
  createdAt: string;
}

export const fetchAdminNotifications = () =>
  api.get<AdminNotification[]>('/admin/notifications').then((r) => r.data);

export const markNotificationRead = (id: string) =>
  api.post<AdminNotification>(`/admin/notifications/${id}/read`).then((r) => r.data);

export const markAllNotificationsRead = () =>
  api.post('/admin/notifications/read-all');

// User-facing notifications (employer / helper)
export const fetchUserNotifications = () =>
  api.get<AdminNotification[]>('/notifications').then((r) => r.data);

export const markAllUserNotificationsRead = () =>
  api.post('/notifications/read-all');
