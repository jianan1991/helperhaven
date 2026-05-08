import { useEffect, useState } from 'react';
import { useAuthStore } from '../lib/auth';
import { fmtDate } from '../lib/dates';
import { listPlacements, type PlacementView } from '../lib/placements';
import {
  fetchEmployment, fetchLeaveRequests, fetchTodos, fetchHolidays,
  fetchTodoTemplates, createTodoTemplate, deleteTodoTemplate,
  setStartDate, setEndDate, setRestSchedule,
  createLeaveRequest, respondLeaveRequest,
  createTodo, toggleTodoComplete, deleteTodo, requestTermination,
  type EmploymentView, type LeaveRequestView, type TodoView,
  type HolidayView, type TodoTemplateView, type RecurrenceType,
} from '../lib/employment';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ActiveEmploymentPage() {
  const me = useAuthStore((s) => s.user);
  const [placement, setPlacement] = useState<PlacementView | null | undefined>(undefined);
  const [employment, setEmployment] = useState<EmploymentView | null>(null);
  const [tab, setTab] = useState<'overview' | 'calendar' | 'todos'>('overview');

  const today = new Date();
  const todayStr = isoDate(today);

  // calendar
  const [calMonth, setCalMonth] = useState(today);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestView[]>([]);
  const [holidays, setHolidays] = useState<HolidayView[]>([]);
  const [leaveForm, setLeaveForm] = useState<{ open: boolean; type: string; start: string; end: string; note: string }>({
    open: false, type: 'ANNUAL', start: todayStr, end: todayStr, note: '',
  });

  // todos
  const [todos, setTodos] = useState<TodoView[]>([]);
  const [templates, setTemplates] = useState<TodoTemplateView[]>([]);
  const [newTodoDesc, setNewTodoDesc] = useState('');
  const [newTodoDue, setNewTodoDue] = useState(todayStr);
  const [addingTodo, setAddingTodo] = useState(false);

  // termination
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [terminating, setTerminating] = useState(false);

  // settings
  const [editStartDate, setEditStartDate] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');
  const [editEndDate, setEditEndDate] = useState(false);
  const [endDateInput, setEndDateInput] = useState('');
  const [editRestSchedule, setEditRestSchedule] = useState(false);
  const [restDaysPerWeekInput, setRestDaysPerWeekInput] = useState(1);
  const [restDayInput, setRestDayInput] = useState<number>(6);
  const [restDay2Input, setRestDay2Input] = useState<number>(5); // Saturday default

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmployer = me?.role === 'EMPLOYER';
  const isHelper = me?.role === 'HELPER';

  useEffect(() => {
    listPlacements().then((ps) => {
      const active = ps.find((p) => p.status === 'ACTIVE');
      setPlacement(active ?? null);
    }).catch(() => setPlacement(null));
  }, []);

  useEffect(() => {
    if (!placement) return;
    fetchEmployment(placement.id).then((e) => {
      setEmployment(e);
      setStartDateInput(e.employmentStartDate ?? todayStr);
      setEndDateInput(e.employmentEndDate ?? '');
      setRestDaysPerWeekInput(e.restDaysPerWeek ?? 1);
      setRestDayInput(e.restDayOfWeek ?? 6);
      setRestDay2Input(e.restDayOfWeek2 ?? 5);
    }).catch(() => {});
    // Load leave eagerly so calendar rest-day + leave both work from the start
    fetchLeaveRequests(placement.id).then(setLeaveRequests).catch(() => {});
  }, [placement]);

  // Reload leave + holidays when calendar month changes
  useEffect(() => {
    if (!placement) return;
    const from = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const to = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    fetchHolidays(placement.id, isoDate(from), isoDate(to)).then(setHolidays).catch(() => {});
  }, [calMonth, placement]);

  useEffect(() => {
    if (tab !== 'todos' || !placement) return;
    fetchTodos(placement.id, todayStr).then(setTodos).catch(() => {});
    fetchTodoTemplates(placement.id).then(setTemplates).catch(() => {});
  }, [tab, placement]);

  if (placement === undefined) return <LoadingState />;

  if (!placement) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-center">
        <div className="text-5xl mb-4">🏠</div>
        <h1 className="text-2xl font-semibold text-ink-900 mb-2">No Active Employment</h1>
        <p className="text-ink-500">You don't have an active hiring yet. Once a hiring reaches the Active stage it will appear here.</p>
      </div>
    );
  }

  const placementId = placement.id;

  async function handleSaveStartDate() {
    if (!startDateInput) return;
    setSaving(true);
    setError(null);
    try {
      const e = await setStartDate(placementId, startDateInput);
      setEmployment(e);
      setEndDateInput(e.employmentEndDate ?? '');
      setEditStartDate(false);
    } catch { setError('Failed to save start date'); }
    setSaving(false);
  }

  async function handleSaveEndDate() {
    if (!endDateInput) return;
    setSaving(true);
    setError(null);
    try {
      const e = await setEndDate(placementId, endDateInput);
      setEmployment(e);
      setEditEndDate(false);
    } catch { setError('Failed to save end date'); }
    setSaving(false);
  }

  async function handleSaveRestSchedule() {
    setSaving(true);
    setError(null);
    try {
      const e = await setRestSchedule(
        placementId,
        restDaysPerWeekInput,
        restDayInput,
        restDaysPerWeekInput === 2 ? restDay2Input : null,
      );
      setEmployment(e);
      setEditRestSchedule(false);
    } catch { setError('Failed to save rest schedule'); }
    setSaving(false);
  }

  async function handleLeaveSubmit() {
    setSaving(true);
    setError(null);
    try {
      const lr = await createLeaveRequest(placementId, {
        type: leaveForm.type,
        startDate: leaveForm.start,
        endDate: leaveForm.end,
        note: leaveForm.note || undefined,
      });
      setLeaveRequests((prev) => [...prev, lr]);
      setLeaveForm((f) => ({ ...f, open: false, note: '' }));
    } catch { setError('Failed to submit leave request'); }
    setSaving(false);
  }

  async function handleRespond(leaveId: string, approved: boolean) {
    try {
      const updated = await respondLeaveRequest(placementId, leaveId, approved);
      setLeaveRequests((prev) => prev.map((lr) => lr.id === leaveId ? updated : lr));
    } catch { setError('Failed to respond'); }
  }

  async function handleAddTodo() {
    if (!newTodoDesc.trim()) return;
    setAddingTodo(true);
    try {
      const t = await createTodo(placementId, newTodoDesc.trim(), newTodoDue);
      setTodos((prev) => [...prev, t]);
      setNewTodoDesc('');
    } catch { setError('Failed to add task'); }
    setAddingTodo(false);
  }

  async function handleToggleTodo(todoId: string) {
    try {
      const updated = await toggleTodoComplete(placementId, todoId);
      setTodos((prev) => prev.map((t) => t.id === todoId ? updated : t));
    } catch { setError('Failed to update task'); }
  }

  async function handleDeleteTodo(todoId: string) {
    try {
      await deleteTodo(placementId, todoId);
      setTodos((prev) => prev.filter((t) => t.id !== todoId));
    } catch { setError('Failed to delete task'); }
  }

  async function handleTerminate() {
    if (!terminateReason.trim()) return;
    setTerminating(true);
    try {
      await requestTermination(placementId, terminateReason.trim());
      setTerminateOpen(false);
      setError(null);
      alert(employment?.engagementMode === 'JWC'
        ? 'Termination request submitted. Our team will contact you to assist with the process.'
        : 'Employment has been terminated.');
    } catch { setError('Failed to submit termination request'); }
    setTerminating(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-sage-700">Active Employment</div>
        <h1 className="serif text-3xl font-bold text-ink-900 mt-1">
          {employment
            ? (isEmployer ? employment.helperDisplayName : employment.employerDisplayName)
            : 'Employment'}
        </h1>
        {employment && (
          <p className="text-ink-500 mt-1 text-sm">{employment.engagementMode} mode</p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex border-b border-cream-200 mb-6 gap-1">
        {(['overview', 'calendar', 'todos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors ${
              tab === t ? 'border-sage-600 text-sage-700' : 'border-transparent text-ink-500 hover:text-ink-700'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'calendar' ? 'Calendar' : 'To-Do List'}
          </button>
        ))}
      </div>

      {tab === 'overview' && employment && (
        <OverviewTab
          employment={employment}
          isEmployer={isEmployer}
          editStartDate={editStartDate} setEditStartDate={setEditStartDate}
          startDateInput={startDateInput} setStartDateInput={setStartDateInput}
          handleSaveStartDate={handleSaveStartDate}
          editEndDate={editEndDate} setEditEndDate={setEditEndDate}
          endDateInput={endDateInput} setEndDateInput={setEndDateInput}
          handleSaveEndDate={handleSaveEndDate}
          editRestSchedule={editRestSchedule} setEditRestSchedule={setEditRestSchedule}
          restDaysPerWeekInput={restDaysPerWeekInput} setRestDaysPerWeekInput={setRestDaysPerWeekInput}
          restDayInput={restDayInput} setRestDayInput={setRestDayInput}
          restDay2Input={restDay2Input} setRestDay2Input={setRestDay2Input}
          handleSaveRestSchedule={handleSaveRestSchedule}
          saving={saving}
          onTerminate={() => setTerminateOpen(true)}
        />
      )}

      {tab === 'calendar' && (
        <CalendarTab
          employment={employment}
          calMonth={calMonth} setCalMonth={setCalMonth}
          leaveRequests={leaveRequests} holidays={holidays}
          today={today}
          isHelper={isHelper} isEmployer={isEmployer}
          leaveForm={leaveForm} setLeaveForm={setLeaveForm}
          handleLeaveSubmit={handleLeaveSubmit}
          handleRespond={handleRespond}
          saving={saving}
        />
      )}

      {tab === 'todos' && (
        <TodoTab
          todos={todos} setTodos={setTodos}
          templates={templates} setTemplates={setTemplates}
          isEmployer={isEmployer} isHelper={isHelper}
          placementId={placementId}
          newTodoDesc={newTodoDesc} setNewTodoDesc={setNewTodoDesc}
          newTodoDue={newTodoDue} setNewTodoDue={setNewTodoDue}
          addingTodo={addingTodo}
          handleAddTodo={handleAddTodo}
          handleToggleTodo={handleToggleTodo}
          handleDeleteTodo={handleDeleteTodo}
          todayStr={todayStr}
        />
      )}

      {terminateOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setTerminateOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-ink-900 mb-1">Request Termination</h2>
              <p className="text-sm text-ink-500 mb-4">
                {employment?.engagementMode === 'JWC'
                  ? 'Our team will contact you to assist with the termination process.'
                  : 'This will immediately terminate the employment.'}
              </p>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Reason</label>
              <textarea
                className="w-full border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-sage-400"
                placeholder="Please provide a reason..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setTerminateOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-cream-300 text-sm text-ink-600 hover:bg-cream-50">
                  Cancel
                </button>
                <button
                  onClick={() => void handleTerminate()}
                  disabled={!terminateReason.trim() || terminating}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                  {terminating ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  employment, isEmployer,
  editStartDate, setEditStartDate, startDateInput, setStartDateInput, handleSaveStartDate,
  editEndDate, setEditEndDate, endDateInput, setEndDateInput, handleSaveEndDate,
  editRestSchedule, setEditRestSchedule,
  restDaysPerWeekInput, setRestDaysPerWeekInput,
  restDayInput, setRestDayInput,
  restDay2Input, setRestDay2Input,
  handleSaveRestSchedule,
  saving, onTerminate,
}: {
  employment: EmploymentView; isEmployer: boolean;
  editStartDate: boolean; setEditStartDate: (v: boolean) => void;
  startDateInput: string; setStartDateInput: (v: string) => void;
  handleSaveStartDate: () => Promise<void>;
  editEndDate: boolean; setEditEndDate: (v: boolean) => void;
  endDateInput: string; setEndDateInput: (v: string) => void;
  handleSaveEndDate: () => Promise<void>;
  editRestSchedule: boolean; setEditRestSchedule: (v: boolean) => void;
  restDaysPerWeekInput: number; setRestDaysPerWeekInput: (v: number) => void;
  restDayInput: number; setRestDayInput: (v: number) => void;
  restDay2Input: number; setRestDay2Input: (v: number) => void;
  handleSaveRestSchedule: () => Promise<void>;
  saving: boolean; onTerminate: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Employment period */}
      <div className="rounded-2xl bg-white border border-cream-200 p-5">
        <h2 className="text-sm font-semibold text-ink-700 mb-4 uppercase tracking-wide">Employment Period</h2>
        <div className="grid grid-cols-2 gap-6">
          {/* Start date */}
          <div>
            <p className="text-xs text-ink-400 mb-1">Start Date</p>
            {isEmployer && editStartDate ? (
              <div className="space-y-2">
                <input
                  type="date"
                  className="w-full border border-cream-300 rounded-lg px-2 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                />
                <p className="text-[11px] text-ink-400">End date will be set to 2 years from start.</p>
                <div className="flex gap-2">
                  <button disabled={saving || !startDateInput} onClick={() => void handleSaveStartDate()}
                    className="text-xs text-white bg-sage-600 hover:bg-sage-700 px-3 py-1 rounded-lg disabled:opacity-50">
                    Save
                  </button>
                  <button onClick={() => setEditStartDate(false)} className="text-xs text-ink-400 hover:text-ink-600">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink-900">
                  {employment.employmentStartDate ? fmtDate(employment.employmentStartDate) : <span className="text-ink-400 italic">Not set</span>}
                </p>
                {isEmployer && (
                  <button onClick={() => setEditStartDate(true)} className="text-[10px] text-sage-600 hover:text-sage-800 underline">edit</button>
                )}
              </div>
            )}
          </div>

          {/* End date */}
          <div>
            <p className="text-xs text-ink-400 mb-1">End Date</p>
            {isEmployer && editEndDate ? (
              <div className="space-y-2">
                <input
                  type="date"
                  className="w-full border border-cream-300 rounded-lg px-2 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                />
                <div className="flex gap-2">
                  <button disabled={saving || !endDateInput} onClick={() => void handleSaveEndDate()}
                    className="text-xs text-white bg-sage-600 hover:bg-sage-700 px-3 py-1 rounded-lg disabled:opacity-50">
                    Save
                  </button>
                  <button onClick={() => setEditEndDate(false)} className="text-xs text-ink-400 hover:text-ink-600">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink-900">
                  {employment.employmentEndDate ? fmtDate(employment.employmentEndDate) : <span className="text-ink-400 italic">Not set</span>}
                </p>
                {isEmployer && (
                  <button onClick={() => setEditEndDate(true)} className="text-[10px] text-sage-600 hover:text-sage-800 underline">edit</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Start date prompt if missing */}
        {isEmployer && !employment.employmentStartDate && !editStartDate && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-center gap-2">
            <span className="text-amber-500">⚠</span>
            <p className="text-xs text-amber-800">
              Please set a start date. The end date (2-year contract) will be calculated automatically.
            </p>
            <button onClick={() => setEditStartDate(true)}
              className="ml-auto text-xs font-medium text-amber-700 hover:text-amber-900 underline shrink-0">
              Set now
            </button>
          </div>
        )}
      </div>

      {/* Rest schedule */}
      <div className="rounded-2xl bg-white border border-cream-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide">Weekly Rest Schedule</h2>
          {isEmployer && !editRestSchedule && (
            <button
              onClick={() => {
                setRestDaysPerWeekInput(employment.restDaysPerWeek ?? 1);
                setRestDayInput(employment.restDayOfWeek ?? 6);
                setRestDay2Input(employment.restDayOfWeek2 ?? 5);
                setEditRestSchedule(true);
              }}
              className="text-[10px] text-sage-600 hover:text-sage-800 underline"
            >
              edit
            </button>
          )}
        </div>

        {isEmployer && editRestSchedule ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1.5">Rest days per week</label>
              <div className="flex gap-2">
                {[1, 2].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRestDaysPerWeekInput(n)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      restDaysPerWeekInput === n
                        ? 'bg-sage-600 text-white border-sage-600'
                        : 'bg-white text-ink-600 border-cream-300 hover:border-sage-400'
                    }`}
                  >
                    {n} day{n > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
            <div className={`grid gap-4 ${restDaysPerWeekInput === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1.5">
                  {restDaysPerWeekInput === 2 ? 'First rest day' : 'Rest day'}
                </label>
                <select
                  className="w-full border border-cream-300 rounded-lg px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
                  value={restDayInput}
                  onChange={(e) => setRestDayInput(parseInt(e.target.value))}
                >
                  {DAY_LABELS.map((d, i) => (
                    <option key={i} value={i} disabled={restDaysPerWeekInput === 2 && i === restDay2Input}>{d}</option>
                  ))}
                </select>
              </div>
              {restDaysPerWeekInput === 2 && (
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1.5">Second rest day</label>
                  <select
                    className="w-full border border-cream-300 rounded-lg px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
                    value={restDay2Input}
                    onChange={(e) => setRestDay2Input(parseInt(e.target.value))}
                  >
                    {DAY_LABELS.map((d, i) => (
                      <option key={i} value={i} disabled={i === restDayInput}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                disabled={saving}
                onClick={() => void handleSaveRestSchedule()}
                className="text-xs text-white bg-sage-600 hover:bg-sage-700 px-3 py-1 rounded-lg disabled:opacity-50"
              >
                Save
              </button>
              <button onClick={() => setEditRestSchedule(false)} className="text-xs text-ink-400 hover:text-ink-600">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex gap-1.5 mb-2">
              {DAY_LABELS.map((d, i) => {
                const isRest = employment.restDayOfWeek === i || employment.restDayOfWeek2 === i;
                return (
                  <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-medium transition-colors ${
                    isRest ? 'bg-sage-600 text-white' : 'bg-cream-100 text-ink-400'
                  }`}>{d}</div>
                );
              })}
            </div>
            <p className="text-xs text-ink-500">
              {employment.restDayOfWeek == null
                ? 'No rest day set — this will also affect the calendar view.'
                : `${employment.restDaysPerWeek ?? 1} day${(employment.restDaysPerWeek ?? 1) > 1 ? 's' : ''} per week`}
            </p>
          </div>
        )}
      </div>

      {/* Termination */}
      {isEmployer && (
        <div className="rounded-2xl bg-white border border-red-200 p-5">
          <h2 className="text-sm font-semibold text-red-700 mb-2 uppercase tracking-wide">End Employment</h2>
          <p className="text-xs text-ink-500 mb-3">
            Request an early termination. If you're on JWC services, our team will contact you to assist.
          </p>
          <button onClick={onTerminate}
            className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors">
            Request Termination
          </button>
        </div>
      )}
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

const LEAVE_COLORS: Record<string, { approved: string; pending: string; label: string }> = {
  ANNUAL:     { approved: 'bg-sage-400',   pending: 'bg-orange-300', label: 'Annual Leave' },
  MEDICAL:    { approved: 'bg-amber-400',  pending: 'bg-orange-300', label: 'Medical Leave' },
  FAMILY_AWAY:{ approved: 'bg-sky-400',    pending: 'bg-orange-300', label: 'Family Away' },
};

function CalendarTab({
  employment, calMonth, setCalMonth, leaveRequests, holidays, today,
  isHelper, isEmployer, leaveForm, setLeaveForm, handleLeaveSubmit, handleRespond, saving,
}: {
  employment: EmploymentView | null;
  calMonth: Date; setCalMonth: (d: Date) => void;
  leaveRequests: LeaveRequestView[]; holidays: HolidayView[];
  today: Date; isHelper: boolean; isEmployer: boolean;
  leaveForm: { open: boolean; type: string; start: string; end: string; note: string };
  setLeaveForm: React.Dispatch<React.SetStateAction<{ open: boolean; type: string; start: string; end: string; note: string }>>;
  handleLeaveSubmit: () => Promise<void>;
  handleRespond: (id: string, approved: boolean) => Promise<void>;
  saving: boolean;
}) {
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const holidayMap: Record<string, string> = {};
  holidays.forEach((h) => { holidayMap[h.date] = h.name; });

  function leaveOnDay(day: number) {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaveRequests.filter((lr) => lr.startDate <= d && lr.endDate >= d && lr.status !== 'DENIED');
  }

  function isRestDay(day: number) {
    if (employment?.restDayOfWeek == null) return false;
    const dow = (new Date(year, month, day).getDay() + 6) % 7;
    return dow === employment.restDayOfWeek ||
      (employment.restDaysPerWeek >= 2 && employment.restDayOfWeek2 != null && dow === employment.restDayOfWeek2);
  }

  function isToday(day: number) {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  }

  const pendingLeave = leaveRequests.filter((lr) => lr.status === 'PENDING');

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sage-100 border border-sage-300 inline-block" /> Rest day</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 inline-block" /> Public holiday</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Family away</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sage-500 inline-block" /> Annual leave</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Medical leave</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-300 inline-block" /> Pending approval</span>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl bg-white border border-cream-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream-100">
          <button onClick={() => setCalMonth(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-cream-100 text-ink-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-sm font-semibold text-ink-900">
            {calMonth.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCalMonth(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-cream-100 text-ink-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-cream-100">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-medium text-ink-400 uppercase">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: startOffset }, (_, i) => (
            <div key={`e-${i}`} className="min-h-[60px] border-b border-r border-cream-50" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const restDay = isRestDay(day);
            const holiday = dateStr in holidayMap;
            const dayLeave = leaveOnDay(day);
            const todayCell = isToday(day);

            // Group leave by type, prefer approved over pending
            const leaveByType: Record<string, LeaveRequestView> = {};
            dayLeave.forEach((lr) => {
              const existing = leaveByType[lr.type];
              if (!existing || (lr.status === 'APPROVED' && existing.status !== 'APPROVED')) {
                leaveByType[lr.type] = lr;
              }
            });
            const leaveEntries = Object.values(leaveByType);

            return (
              <div
                key={day}
                className={`min-h-[60px] p-1 border-b border-r border-cream-50 relative flex flex-col ${
                  holiday ? 'bg-amber-50' : restDay ? 'bg-sage-50' : ''
                }`}
              >
                {/* Day number */}
                <div className="flex items-start justify-between mb-0.5">
                  <span className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                    todayCell ? 'bg-sage-600 text-white' : holiday ? 'text-amber-700' : restDay ? 'text-sage-700' : 'text-ink-700'
                  }`}>
                    {day}
                  </span>
                  {restDay && (
                    <span className="text-[8px] font-semibold text-sage-600 uppercase leading-tight">Rest</span>
                  )}
                </div>

                {/* Holiday name */}
                {holiday && (
                  <div className="text-[8px] text-amber-600 leading-tight truncate" title={holidayMap[dateStr]}>
                    {holidayMap[dateStr]}
                  </div>
                )}

                {/* Leave dots */}
                {leaveEntries.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-auto pt-1">
                    {leaveEntries.map((lr) => {
                      const colors = LEAVE_COLORS[lr.type];
                      return (
                        <span
                          key={lr.type}
                          title={`${colors?.label ?? lr.type} (${lr.status})`}
                          className={`w-2 h-2 rounded-full ${lr.status === 'APPROVED' ? colors?.approved : colors?.pending} inline-block`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending leave (employer approves) */}
      {isEmployer && pendingLeave.length > 0 && (
        <div className="rounded-2xl bg-white border border-amber-200 p-4">
          <h3 className="text-sm font-semibold text-ink-800 mb-3">Pending Leave Requests</h3>
          <div className="space-y-2">
            {pendingLeave.map((lr) => (
              <div key={lr.id} className="flex items-center justify-between gap-3 py-2 border-b border-cream-100 last:border-0">
                <div>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mr-2 ${
                    lr.type === 'ANNUAL' ? 'bg-sage-100 text-sage-800' :
                    lr.type === 'MEDICAL' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                  }`}>
                    {LEAVE_COLORS[lr.type]?.label ?? lr.type}
                  </span>
                  <span className="text-xs text-ink-700">{fmtDate(lr.startDate)} – {fmtDate(lr.endDate)}</span>
                  {lr.note && <p className="text-xs text-ink-400 mt-0.5">{lr.note}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => void handleRespond(lr.id, true)}
                    className="px-2.5 py-1 rounded-lg bg-sage-600 text-white text-xs font-medium hover:bg-sage-700">
                    Approve
                  </button>
                  <button onClick={() => void handleRespond(lr.id, false)}
                    className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50">
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave request form + list */}
      <div className="rounded-2xl bg-white border border-cream-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink-800">
            {isHelper ? 'Request Leave' : 'Mark Family Away'}
          </h3>
          <button
            onClick={() => setLeaveForm((f) => ({ ...f, open: !f.open }))}
            className="text-xs text-sage-700 hover:text-sage-900 font-medium"
          >
            {leaveForm.open ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {leaveForm.open && (
          <div className="space-y-3 mb-4 pb-4 border-b border-cream-100">
            {isHelper && (
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Type</label>
                <select
                  className="w-full border border-cream-300 rounded-lg px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="MEDICAL">Medical Leave</option>
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">From</label>
                <input type="date" className="w-full border border-cream-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                  value={leaveForm.start} onChange={(e) => setLeaveForm((f) => ({ ...f, start: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">To</label>
                <input type="date" className="w-full border border-cream-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                  value={leaveForm.end} onChange={(e) => setLeaveForm((f) => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Note (optional)</label>
              <input type="text" className="w-full border border-cream-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                placeholder="e.g. medical appointment"
                value={leaveForm.note} onChange={(e) => setLeaveForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <button disabled={saving} onClick={() => void handleLeaveSubmit()}
              className="w-full py-2 rounded-xl bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 disabled:opacity-50">
              {saving ? 'Submitting…' : isEmployer ? 'Mark Family Away' : 'Submit Request'}
            </button>
          </div>
        )}

        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {leaveRequests.length === 0 && (
            <p className="text-xs text-ink-400 text-center py-3">No leave requests yet.</p>
          )}
          {leaveRequests.map((lr) => (
            <div key={lr.id} className="flex items-center justify-between text-xs py-1.5 border-b border-cream-50 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  lr.type === 'ANNUAL' ? 'bg-sage-100 text-sage-800' :
                  lr.type === 'MEDICAL' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                }`}>
                  {LEAVE_COLORS[lr.type]?.label ?? lr.type}
                </span>
                <span className="text-ink-600">{fmtDate(lr.startDate)}{lr.startDate !== lr.endDate ? ` – ${fmtDate(lr.endDate)}` : ''}</span>
              </div>
              <span className={`text-[10px] font-medium ${
                lr.status === 'APPROVED' ? 'text-sage-600' : lr.status === 'DENIED' ? 'text-red-500' : 'text-amber-600'
              }`}>
                {lr.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Todo Tab ──────────────────────────────────────────────────────────────────

const REC_BADGE: Record<RecurrenceType, { label: string; cls: string }> = {
  DAILY:    { label: 'Daily',    cls: 'bg-sage-100 text-sage-700' },
  WEEKDAYS: { label: 'Weekdays', cls: 'bg-sky-100 text-sky-700' },
  WEEKENDS: { label: 'Weekends', cls: 'bg-violet-100 text-violet-700' },
  WEEKLY:   { label: 'Weekly',   cls: 'bg-orange-100 text-orange-700' },
};

function TodoTab({
  todos, setTodos, templates, setTemplates,
  isEmployer, isHelper, placementId,
  newTodoDesc, setNewTodoDesc, newTodoDue, setNewTodoDue,
  addingTodo, handleAddTodo, handleToggleTodo, handleDeleteTodo, todayStr,
}: {
  todos: TodoView[]; setTodos: React.Dispatch<React.SetStateAction<TodoView[]>>;
  templates: TodoTemplateView[]; setTemplates: React.Dispatch<React.SetStateAction<TodoTemplateView[]>>;
  isEmployer: boolean; isHelper: boolean; placementId: string;
  newTodoDesc: string; setNewTodoDesc: (v: string) => void;
  newTodoDue: string; setNewTodoDue: (v: string) => void;
  addingTodo: boolean;
  handleAddTodo: () => Promise<void>;
  handleToggleTodo: (id: string) => Promise<void>;
  handleDeleteTodo: (id: string) => Promise<void>;
  todayStr: string;
}) {
  const recurring = todos.filter((t) => t.recurring);
  const adhoc = todos.filter((t) => !t.recurring);

  return (
    <div className="space-y-5">
      {isEmployer && (
        <RoutineManager
          placementId={placementId}
          templates={templates}
          setTemplates={setTemplates}
          setTodos={setTodos}
          todayStr={todayStr}
        />
      )}

      {/* Today's Tasks */}
      <div className="rounded-2xl bg-white border border-cream-200 p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide">Today — {fmtDate(todayStr)}</h2>
          <p className="text-xs text-ink-400 mt-0.5">
            {isEmployer ? 'Routine tasks auto-appear. Add one-off tasks below.' : 'Check off tasks as you complete them.'}
          </p>
        </div>

        {recurring.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {recurring.filter((t) => !t.completed).map((t) => (
              <TodoRow key={t.id} todo={t} isHelper={isHelper} isEmployer={isEmployer}
                onToggle={handleToggleTodo} onDelete={handleDeleteTodo} showDate={false} />
            ))}
            {recurring.filter((t) => t.completed).map((t) => (
              <TodoRow key={t.id} todo={t} isHelper={isHelper} isEmployer={isEmployer}
                onToggle={handleToggleTodo} onDelete={handleDeleteTodo} showDate={false} done />
            ))}
          </div>
        )}

        {(isEmployer || adhoc.length > 0) && (
          <div>
            {recurring.length > 0 && <div className="border-t border-cream-100 pt-4 mb-3" />}
            {adhoc.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {adhoc.filter((t) => !t.completed).map((t) => (
                  <TodoRow key={t.id} todo={t} isHelper={isHelper} isEmployer={isEmployer}
                    onToggle={handleToggleTodo} onDelete={handleDeleteTodo} showDate={t.dueDate !== todayStr} />
                ))}
                {adhoc.filter((t) => t.completed).map((t) => (
                  <TodoRow key={t.id} todo={t} isHelper={isHelper} isEmployer={isEmployer}
                    onToggle={handleToggleTodo} onDelete={handleDeleteTodo} showDate={t.dueDate !== todayStr} done />
                ))}
              </div>
            )}
            {isEmployer && (
              <div className="flex gap-2 mt-2">
                <input type="text"
                  className="flex-1 border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
                  placeholder="Add a one-off task…"
                  value={newTodoDesc} onChange={(e) => setNewTodoDesc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleAddTodo()}
                />
                <input type="date"
                  className="border border-cream-300 rounded-xl px-2 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
                  value={newTodoDue} onChange={(e) => setNewTodoDue(e.target.value)}
                />
                <button disabled={addingTodo || !newTodoDesc.trim()} onClick={() => void handleAddTodo()}
                  className="px-4 py-2 rounded-xl bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 disabled:opacity-50">
                  Add
                </button>
              </div>
            )}
          </div>
        )}

        {todos.length === 0 && !isEmployer && (
          <p className="text-xs text-ink-400 text-center py-4">No tasks for today.</p>
        )}
      </div>
    </div>
  );
}

// ── Routine Manager ────────────────────────────────────────────────────────────

const ROUTINE_SECTIONS: { type: RecurrenceType; title: string; subtitle: string }[] = [
  { type: 'DAILY',    title: 'Every Day',          subtitle: 'Appears 7 days a week' },
  { type: 'WEEKDAYS', title: 'Weekdays (Mon–Fri)',  subtitle: 'Appears Monday to Friday' },
  { type: 'WEEKENDS', title: 'Weekends (Sat–Sun)',  subtitle: 'Appears Saturday and Sunday' },
  { type: 'WEEKLY',   title: 'Specific Days',       subtitle: 'Pick which days of the week' },
];

function RoutineManager({
  placementId, templates, setTemplates, setTodos, todayStr,
}: {
  placementId: string;
  templates: TodoTemplateView[];
  setTemplates: React.Dispatch<React.SetStateAction<TodoTemplateView[]>>;
  setTodos: React.Dispatch<React.SetStateAction<TodoView[]>>;
  todayStr: string;
}) {
  const [activeSection, setActiveSection] = useState<RecurrenceType | null>(null);

  async function handleAdd(desc: string, type: RecurrenceType, daysOfWeek?: number, includeOnRestDay?: boolean) {
    try {
      const t = await createTodoTemplate(placementId, desc, type, daysOfWeek, includeOnRestDay);
      setTemplates((prev) => [...prev, t]);
      // Reload today's todos — new template may apply today
      fetchTodos(placementId, todayStr).then(setTodos).catch(() => {});
      setActiveSection(null);
    } catch { /* silent — section stays open */ }
  }

  async function handleDelete(templateId: string) {
    try {
      await deleteTodoTemplate(placementId, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      fetchTodos(placementId, todayStr).then(setTodos).catch(() => {});
    } catch { /* silent */ }
  }

  return (
    <div className="rounded-2xl bg-white border border-cream-200 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide">Routine Manager</h2>
        <p className="text-xs text-ink-400 mt-0.5">Set recurring tasks for your helper — they auto-appear each applicable day.</p>
      </div>

      <div className="divide-y divide-cream-100">
        {ROUTINE_SECTIONS.map((section) => (
          <RoutineSection
            key={section.type}
            title={section.title}
            subtitle={section.subtitle}
            type={section.type}
            templates={templates.filter((t) => t.recurrenceType === section.type)}
            active={activeSection === section.type}
            onToggleActive={() => setActiveSection((prev) => prev === section.type ? null : section.type)}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

function RoutineSection({
  title, subtitle, type, templates, active, onToggleActive, onAdd, onDelete,
}: {
  title: string; subtitle: string; type: RecurrenceType;
  templates: TodoTemplateView[];
  active: boolean;
  onToggleActive: () => void;
  onAdd: (desc: string, type: RecurrenceType, daysOfWeek?: number, includeOnRestDay?: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [desc, setDesc] = useState('');
  const [days, setDays] = useState(0);
  const [includeOnRestDay, setIncludeOnRestDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const badge = REC_BADGE[type];

  function toggleDay(i: number) {
    setDays((prev) => prev ^ (1 << i));
  }

  function daysLabel(tmpl: TodoTemplateView) {
    if (!tmpl.daysOfWeek) return '';
    return DAY_LABELS.filter((_, i) => ((tmpl.daysOfWeek! >> i) & 1) === 1).join(', ');
  }

  async function submit() {
    if (!desc.trim()) return;
    if (type === 'WEEKLY' && days === 0) return;
    setSaving(true);
    await onAdd(desc.trim(), type, type === 'WEEKLY' ? days : undefined, includeOnRestDay);
    setDesc('');
    setDays(0);
    setIncludeOnRestDay(false);
    setSaving(false);
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${badge.cls}`}>
              {badge.label}
            </span>
            <span className="text-sm font-medium text-ink-800">{title}</span>
          </div>
          <p className="text-[11px] text-ink-400 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={onToggleActive}
          className="shrink-0 text-xs text-sage-600 hover:text-sage-800 font-medium"
        >
          {active ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {templates.length > 0 && (
        <div className="space-y-1 mb-2">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="flex items-center gap-2 py-1 rounded-lg px-2 hover:bg-cream-50 group">
              <span className="text-[10px] text-ink-300 shrink-0">↻</span>
              <span className="flex-1 text-sm text-ink-700">{tmpl.description}</span>
              {type === 'WEEKLY' && (
                <span className="text-[10px] text-ink-400 shrink-0">{daysLabel(tmpl)}</span>
              )}
              {tmpl.includeOnRestDay && (
                <span className="text-[9px] bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">+ rest day</span>
              )}
              <button onClick={() => void onDelete(tmpl.id)}
                className="text-ink-200 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {templates.length === 0 && !active && (
        <p className="text-xs text-ink-300 italic">No tasks yet.</p>
      )}

      {active && (
        <div className="mt-2 space-y-2 bg-cream-50 rounded-xl p-3">
          {type === 'WEEKLY' && (
            <div>
              <p className="text-[11px] text-ink-500 mb-1.5">Which days?</p>
              <div className="flex gap-1">
                {DAY_LABELS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`w-8 h-8 rounded-full text-[11px] font-semibold transition-colors ${
                      (days >> i) & 1 ? 'bg-sage-600 text-white' : 'bg-white border border-cream-300 text-ink-500 hover:border-sage-400'
                    }`}>
                    {d[0]}
                  </button>
                ))}
              </div>
              {days === 0 && <p className="text-[11px] text-amber-600 mt-1">Select at least one day.</p>}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text"
              className="flex-1 border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
              placeholder="Task description…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              autoFocus
            />
            <button
              disabled={saving || !desc.trim() || (type === 'WEEKLY' && days === 0)}
              onClick={() => void submit()}
              className="px-4 py-2 rounded-xl bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 disabled:opacity-50"
            >
              {saving ? '…' : 'Add'}
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeOnRestDay}
              onChange={(e) => setIncludeOnRestDay(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-sage-600"
            />
            <span className="text-xs text-ink-500">Include on rest days</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ── Todo Row ───────────────────────────────────────────────────────────────────

function TodoRow({
  todo: t, isHelper, isEmployer, onToggle, onDelete, showDate, done = false,
}: {
  todo: TodoView; isHelper: boolean; isEmployer: boolean;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showDate: boolean; done?: boolean;
}) {
  const badge = t.recurrenceType ? REC_BADGE[t.recurrenceType] : null;
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {isHelper ? (
        <button onClick={() => void onToggle(t.id)}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
            done ? 'bg-sage-500 border-sage-500' : 'border-cream-300 hover:border-sage-400'
          }`}>
          {done && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </button>
      ) : (
        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${done ? 'bg-sage-500 border-sage-500' : 'border-cream-200'}`}>
          {done && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </span>
      )}
      {badge && (
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${badge.cls}`}>
          {badge.label}
        </span>
      )}
      <span className={`flex-1 text-sm ${done ? 'text-ink-400 line-through' : 'text-ink-800'}`}>{t.description}</span>
      {showDate && <span className="text-[10px] text-ink-400 shrink-0">{fmtDate(t.dueDate)}</span>}
      {isEmployer && !t.recurring && (
        <button onClick={() => void onDelete(t.id)} className="text-ink-300 hover:text-red-400 text-xs shrink-0">✕</button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-center text-ink-400 text-sm">
      Loading…
    </div>
  );
}
