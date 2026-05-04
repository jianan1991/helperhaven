import { api } from './api';

export interface EmploymentView {
  placementId: string;
  status: string;
  engagementMode: string;
  employmentStartDate: string | null;
  employmentEndDate: string | null;
  restDayOfWeek: number | null; // 0=Mon … 6=Sun
  helperDisplayName: string;
  employerDisplayName: string;
  employerId: string;
  helperId: string;
}

export interface LeaveRequestView {
  id: string;
  requesterUserId: string;
  requesterRole: 'EMPLOYER' | 'HELPER';
  type: 'ANNUAL' | 'MEDICAL' | 'FAMILY_AWAY';
  startDate: string;
  endDate: string;
  note: string | null;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  respondedAt: string | null;
  createdAt: string;
}

export type RecurrenceType = 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'WEEKLY';

export interface TodoView {
  id: string;
  description: string;
  dueDate: string;
  completed: boolean;
  recurring: boolean;
  recurrenceType: RecurrenceType | null;
  createdAt: string;
}

export interface TodoTemplateView {
  id: string;
  description: string;
  sortOrder: number;
  recurrenceType: RecurrenceType;
  daysOfWeek: number | null; // bitmask: bit 0=Mon … bit 6=Sun (WEEKLY only)
}

export interface HolidayView {
  id: string;
  date: string;
  name: string;
}

export interface TerminationRequestView {
  id: string;
  placementId: string;
  reason: string | null;
  status: 'PENDING' | 'RESOLVED';
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

// ── Employment overview ──────────────────────────────────────────────────────

export const fetchEmployment = (placementId: string) =>
  api.get<EmploymentView>(`/employment/${placementId}`).then((r) => r.data);

export const setStartDate = (placementId: string, startDate: string) =>
  api.put<EmploymentView>(`/employment/${placementId}/start-date`, { startDate }).then((r) => r.data);

export const setEndDate = (placementId: string, endDate: string) =>
  api.put<EmploymentView>(`/employment/${placementId}/end-date`, { endDate }).then((r) => r.data);

export const setRestDay = (placementId: string, restDayOfWeek: number) =>
  api.put<EmploymentView>(`/employment/${placementId}/rest-day`, { restDayOfWeek }).then((r) => r.data);

// ── Leave requests ───────────────────────────────────────────────────────────

export const fetchLeaveRequests = (placementId: string) =>
  api.get<LeaveRequestView[]>(`/employment/${placementId}/leave-requests`).then((r) => r.data);

export const createLeaveRequest = (
  placementId: string,
  body: { type: string; startDate: string; endDate: string; note?: string }
) => api.post<LeaveRequestView>(`/employment/${placementId}/leave-requests`, body).then((r) => r.data);

export const respondLeaveRequest = (placementId: string, leaveId: string, approved: boolean) =>
  api.put<LeaveRequestView>(`/employment/${placementId}/leave-requests/${leaveId}`, { approved }).then((r) => r.data);

// ── Todos ────────────────────────────────────────────────────────────────────

export const fetchTodos = (placementId: string, date?: string) =>
  api.get<TodoView[]>(`/employment/${placementId}/todos`, { params: date ? { date } : {} }).then((r) => r.data);

export const createTodo = (placementId: string, description: string, dueDate?: string) =>
  api.post<TodoView>(`/employment/${placementId}/todos`, { description, dueDate }).then((r) => r.data);

export const toggleTodoComplete = (placementId: string, todoId: string) =>
  api.post<TodoView>(`/employment/${placementId}/todos/${todoId}/complete`).then((r) => r.data);

export const deleteTodo = (placementId: string, todoId: string) =>
  api.delete(`/employment/${placementId}/todos/${todoId}`);

// ── Todo templates ────────────────────────────────────────────────────────────

export const fetchTodoTemplates = (placementId: string) =>
  api.get<TodoTemplateView[]>(`/employment/${placementId}/todo-templates`).then((r) => r.data);

export const createTodoTemplate = (
  placementId: string,
  description: string,
  recurrenceType: string = 'DAILY',
  daysOfWeek?: number,
) => api.post<TodoTemplateView>(`/employment/${placementId}/todo-templates`, {
  description, recurrenceType, daysOfWeek,
}).then((r) => r.data);

export const deleteTodoTemplate = (placementId: string, templateId: string) =>
  api.delete(`/employment/${placementId}/todo-templates/${templateId}`);

// ── Public holidays ──────────────────────────────────────────────────────────

export const fetchHolidays = (placementId: string, from: string, to: string) =>
  api.get<HolidayView[]>(`/employment/${placementId}/holidays`, { params: { from, to } }).then((r) => r.data);

// ── Termination ──────────────────────────────────────────────────────────────

export const requestTermination = (placementId: string, reason: string) =>
  api.post<TerminationRequestView>(`/employment/${placementId}/terminate`, { reason }).then((r) => r.data);

// ── Admin holidays ───────────────────────────────────────────────────────────

export const fetchAdminHolidays = () =>
  api.get<HolidayView[]>('/admin/holidays').then((r) => r.data);

export const addAdminHoliday = (date: string, name: string) =>
  api.post<HolidayView>('/admin/holidays', { date, name }).then((r) => r.data);

export const deleteAdminHoliday = (id: string) =>
  api.delete(`/admin/holidays/${id}`);

export const uploadHolidaysExcel = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post<{ added: number; skipped: number; errors: string[] }>('/admin/holidays/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

// ── Admin termination ────────────────────────────────────────────────────────

export interface AdminTerminationView {
  id: string;
  placementId: string;
  engagementMode: string;
  employerName: string;
  helperName: string;
  reason: string | null;
  status: 'PENDING' | 'RESOLVED';
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export const fetchAdminTerminations = () =>
  api.get<AdminTerminationView[]>('/admin/termination-requests').then((r) => r.data);

export const resolveTermination = (id: string, adminNotes: string, resolved: boolean) =>
  api.put<AdminTerminationView>(`/admin/termination-requests/${id}`, { adminNotes, resolved }).then((r) => r.data);
