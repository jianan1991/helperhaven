import { useEffect, useRef, useState } from 'react';
import {
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminConversations,
  fetchAdminPlacements,
  fetchAdminHelpers,
  fetchAdminEmployers,
  fetchAdminMessages,
  setUserStatus,
  toggleMessageHidden,
  sendAdminMessage,
  type AdminStats,
  type AdminUser,
  type AdminConversation,
  type AdminPlacement,
  type AdminHelper,
  type AdminEmployer,
  type AdminMessage,
} from '../lib/admin';

type Tab = 'users' | 'placements' | 'chats' | 'helpers' | 'employers';

const POLL_MS = 15_000;

const PLACEMENT_STATUS_LABELS: Record<string, string> = {
  INITIATED: 'New',
  DOCS_COLLECTION: 'Collecting docs',
  MOM_SUBMITTED: 'MOM submitted',
  IPA_ISSUED: 'IPA issued',
  HELPER_ARRIVAL: 'Helper arrival',
  ACTIVE: 'Active',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-sage-100 text-sage-700',
  INITIATED: 'bg-butter-100 text-ink-700',
  DOCS_COLLECTION: 'bg-butter-100 text-ink-700',
  MOM_SUBMITTED: 'bg-sage-50 text-sage-700',
  IPA_ISSUED: 'bg-sage-50 text-sage-700',
  HELPER_ARRIVAL: 'bg-blush-100 text-clay-600',
  PENDING_VERIFICATION: 'bg-butter-200 text-ink-700',
  SUSPENDED: 'bg-blush-200 text-clay-600',
  BANNED: 'bg-blush-200 text-clay-500',
};

const ROLE_COLORS: Record<string, string> = {
  EMPLOYER: 'bg-sage-100 text-sage-700',
  HELPER: 'bg-blush-100 text-clay-600',
  ADMIN: 'bg-butter-200 text-ink-700',
  AGENCY: 'bg-cream-200 text-ink-700',
};

export default function AdminOverviewPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [conversations, setConversations] = useState<AdminConversation[] | null>(null);
  const [placements, setPlacements] = useState<AdminPlacement[] | null>(null);
  const [helpers, setHelpers] = useState<AdminHelper[] | null>(null);
  const [employers, setEmployers] = useState<AdminEmployer[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => fetchAdminStats().then(setStats).catch(() => setError('Could not load stats.'));
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setSearch('');
    const tabLoaders: Record<Tab, () => void> = {
      users:      () => fetchAdminUsers().then(setUsers).catch(() => setError('Could not load users.')),
      chats:      () => fetchAdminConversations().then(setConversations).catch(() => setError('Could not load chats.')),
      placements: () => fetchAdminPlacements().then(setPlacements).catch(() => setError('Could not load placements.')),
      helpers:    () => fetchAdminHelpers().then(setHelpers).catch(() => setError('Could not load helpers.')),
      employers:  () => fetchAdminEmployers().then(setEmployers).catch(() => setError('Could not load employers.')),
    };
    tabLoaders[tab]();
    const id = setInterval(tabLoaders[tab], POLL_MS);
    return () => clearInterval(id);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'users', label: 'Users', count: stats?.totalUsers },
    { id: 'placements', label: 'Hirings', count: stats?.placements },
    { id: 'chats', label: 'Chats', count: stats?.conversations },
    { id: 'helpers', label: 'Helper profiles', count: stats?.helperProfiles },
    { id: 'employers', label: 'Employer profiles', count: stats?.employerProfiles },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-sage-700">Admin · god mode</div>
        <h1 className="serif text-4xl font-bold text-ink-900 mt-2">Platform Overview</h1>
        <p className="mt-2 text-ink-500 text-sm">All users, conversations, hirings and profiles in one place.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-blush-100 border border-blush-200 px-4 py-3 text-sm text-clay-600">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <StatCard label="Total users" value={stats?.totalUsers} />
        <StatCard label="Employers" value={stats?.employers} />
        <StatCard label="Helpers" value={stats?.helpers} />
        <StatCard label="Conversations" value={stats?.conversations} />
        <StatCard label="Hirings" value={stats?.placements} />
        <StatCard label="Helper profiles" value={stats?.helperProfiles} />
        <StatCard label="Employer profiles" value={stats?.employerProfiles} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-cream-200 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'border-b-2 border-sage-700 text-sage-700'
                : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-xs text-ink-400">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search — not shown for chats (uses its own inline thread view) */}
      {tab !== 'chats' && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter by name, email, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80 border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
          />
        </div>
      )}

      {tab === 'users' && (
        <UsersTab rows={users} search={search} onStatusChange={(updated) =>
          setUsers((prev) => prev?.map((u) => u.id === updated.id ? updated : u) ?? null)
        } />
      )}
      {tab === 'placements' && <PlacementsTab rows={placements} search={search} />}
      {tab === 'chats' && (
        <ChatsTab
          rows={conversations}
          onConversationUpdate={(updated) =>
            setConversations((prev) => prev?.map((c) => c.id === updated.id ? updated : c) ?? null)
          }
        />
      )}
      {tab === 'helpers' && (
        <HelpersTab rows={helpers} search={search} onStatusChange={(userId, newStatus) =>
          setHelpers((prev) => prev?.map((h) => h.userId === userId ? { ...h, status: newStatus } : h) ?? null)
        } />
      )}
      {tab === 'employers' && (
        <EmployersTab rows={employers} search={search} onStatusChange={(userId, newStatus) =>
          setEmployers((prev) => prev?.map((e) => e.userId === userId ? { ...e, status: newStatus } : e) ?? null)
        } />
      )}
    </div>
  );
}

// ── Stat card ──

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
      <div className="text-2xl font-bold text-ink-900 tabular-nums">
        {value ?? <span className="inline-block w-8 h-6 bg-cream-200 rounded animate-pulse" />}
      </div>
      <div className="text-xs text-ink-500 mt-0.5">{label}</div>
    </div>
  );
}

// ── Shared helpers ──

function Badge({ text, colorClass }: { text: string; colorClass?: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${colorClass ?? 'bg-cream-200 text-ink-600'}`}>
      {text}
    </span>
  );
}

function Loading() {
  return <div className="py-16 text-center text-ink-400 text-sm">Loading…</div>;
}

function Empty({ label }: { label: string }) {
  return <div className="py-16 text-center text-ink-400 text-sm">No {label} found.</div>;
}

function relTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function filterRows<T>(rows: T[], search: string, keys: (keyof T)[]): T[] {
  if (!search.trim()) return rows;
  const q = search.toLowerCase();
  return rows.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-medium">{children}</th>;
}

// ── Users tab ──

function UsersTab({
  rows,
  search,
  onStatusChange,
}: {
  rows: AdminUser[] | null;
  search: string;
  onStatusChange: (u: AdminUser) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  if (!rows) return <Loading />;
  const filtered = filterRows(rows, search, ['email', 'role', 'status', 'phoneE164']);
  if (!filtered.length) return <Empty label="users" />;

  async function toggleStatus(u: AdminUser) {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setPending(u.id);
    try {
      const updated = await setUserStatus(u.id, next);
      onStatusChange(updated);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white overflow-x-auto shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cream-100 text-xs text-ink-500 uppercase tracking-wide">
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Phone</Th>
            <Th>Joined</Th>
            <Th>Last login</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-50">
          {filtered.map((u) => (
            <tr key={u.id} className={`transition-colors ${u.status === 'SUSPENDED' ? 'bg-blush-50' : 'hover:bg-cream-50'}`}>
              <td className="px-4 py-3">
                <div className="font-medium text-ink-900">{u.email}</div>
                {!u.emailVerified && (
                  <div className="text-[10px] text-clay-500 mt-0.5">unverified</div>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge text={u.role} colorClass={ROLE_COLORS[u.role]} />
              </td>
              <td className="px-4 py-3">
                <Badge text={u.status.replace('_', ' ')} colorClass={STATUS_COLORS[u.status]} />
              </td>
              <td className="px-4 py-3 text-ink-500">{u.phoneE164 ?? '—'}</td>
              <td className="px-4 py-3 text-ink-500 tabular-nums">{relTime(u.createdAt)}</td>
              <td className="px-4 py-3 text-ink-500 tabular-nums">{relTime(u.lastLoginAt)}</td>
              <td className="px-4 py-3">
                {u.role !== 'ADMIN' && (
                  <button
                    onClick={() => void toggleStatus(u)}
                    disabled={pending === u.id}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-40 ${
                      u.status === 'ACTIVE'
                        ? 'bg-blush-100 text-clay-600 hover:bg-blush-200'
                        : 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                    }`}
                  >
                    {pending === u.id ? '…' : u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Placements tab (read-only) ──

function PlacementsTab({ rows, search }: { rows: AdminPlacement[] | null; search: string }) {
  if (!rows) return <Loading />;
  const filtered = filterRows(rows, search, ['employerEmail', 'employerName', 'helperEmail', 'helperName', 'status', 'engagementMode']);
  if (!filtered.length) return <Empty label="hirings" />;
  return (
    <div className="rounded-2xl border border-cream-200 bg-white overflow-x-auto shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cream-100 text-xs text-ink-500 uppercase tracking-wide">
            <Th>Family (employer)</Th>
            <Th>Helper</Th>
            <Th>Mode</Th>
            <Th>Status</Th>
            <Th>Started</Th>
            <Th>Updated</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-50">
          {filtered.map((p) => (
            <tr key={p.id} className="hover:bg-cream-50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-ink-900">{p.employerName || p.employerEmail}</div>
                {p.employerName && <div className="text-xs text-ink-400">{p.employerEmail}</div>}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-ink-900">{p.helperName || p.helperEmail}</div>
                {p.helperName && <div className="text-xs text-ink-400">{p.helperEmail}</div>}
              </td>
              <td className="px-4 py-3">
                <Badge text={p.engagementMode} colorClass={p.engagementMode === 'JWC' ? 'bg-sage-100 text-sage-700' : 'bg-cream-200 text-ink-600'} />
              </td>
              <td className="px-4 py-3">
                <Badge text={PLACEMENT_STATUS_LABELS[p.status] ?? p.status} colorClass={STATUS_COLORS[p.status]} />
              </td>
              <td className="px-4 py-3 text-ink-500 tabular-nums">{relTime(p.createdAt)}</td>
              <td className="px-4 py-3 text-ink-500 tabular-nums">{relTime(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Chats tab ──

function ChatsTab({
  rows,
  onConversationUpdate,
}: {
  rows: AdminConversation[] | null;
  onConversationUpdate: (c: AdminConversation) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (!rows) return <Loading />;
  const filtered = filterRows(rows, search, ['userAEmail', 'userADisplayName', 'userBEmail', 'userBDisplayName']);
  if (!rows.length) return <Empty label="conversations" />;

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
        />
      </div>
      {filtered.length === 0 && <Empty label="conversations" />}
      {filtered.map((c) => (
        <ConversationRow
          key={c.id}
          conv={c}
          expanded={expandedId === c.id}
          onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
        />
      ))}
    </div>
  );
}

function ConversationRow({
  conv,
  expanded,
  onToggle,
}: {
  conv: AdminConversation;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [messages, setMessages] = useState<AdminMessage[] | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && !messages) {
      fetchAdminMessages(conv.id).then(setMessages).catch(() => setMessages([]));
    }
  }, [expanded, conv.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (expanded && messages) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [expanded, messages]);

  async function handleToggleHide(msgId: string) {
    const updated = await toggleMessageHidden(msgId);
    setMessages((prev) => prev?.map((m) => m.id === msgId ? updated : m) ?? null);
  }

  async function handleReply() {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const msg = await sendAdminMessage(conv.id, replyBody);
      setMessages((prev) => prev ? [...prev, msg] : [msg]);
      setReplyBody('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden shadow-soft">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-cream-50 transition-colors"
      >
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-ink-400 mb-0.5">Participant A</div>
            <div className="font-medium text-ink-900 text-sm truncate">{conv.userADisplayName}</div>
            <div className="text-xs text-ink-400 flex items-center gap-1.5 truncate">
              {conv.userAEmail} <Badge text={conv.userARole} colorClass={ROLE_COLORS[conv.userARole]} />
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-400 mb-0.5">Participant B</div>
            <div className="font-medium text-ink-900 text-sm truncate">{conv.userBDisplayName}</div>
            <div className="text-xs text-ink-400 flex items-center gap-1.5 truncate">
              {conv.userBEmail} <Badge text={conv.userBRole} colorClass={ROLE_COLORS[conv.userBRole]} />
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-ink-500 tabular-nums">{relTime(conv.lastMessageAt)}</div>
          <div className="text-xs text-ink-400 mt-0.5">{conv.messageCount} msg</div>
          {conv.lastMessagePreview && (
            <div className="text-xs text-ink-400 mt-1 max-w-[180px] truncate italic">"{conv.lastMessagePreview}"</div>
          )}
        </div>
        <span className="shrink-0 text-ink-400 text-xs ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded thread */}
      {expanded && (
        <div className="border-t border-cream-100">
          {/* Messages */}
          <div className="max-h-80 overflow-y-auto px-5 py-4 space-y-3 bg-cream-50">
            {!messages && <div className="text-center text-ink-400 text-xs py-4">Loading messages…</div>}
            {messages?.length === 0 && <div className="text-center text-ink-400 text-xs py-4">No messages yet.</div>}
            {messages?.map((m) => (
              <div key={m.id} className={`flex items-start gap-3 group ${m.hidden ? 'opacity-40' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${m.senderDisplayName === 'HelperHaven Admin' ? 'text-clay-500' : 'text-ink-700'}`}>
                      {m.senderDisplayName}
                    </span>
                    <span className="text-[10px] text-ink-400">{m.senderEmail}</span>
                    <span className="text-[10px] text-ink-300 tabular-nums">{relTime(m.sentAt)}</span>
                    {m.hidden && <Badge text="hidden" colorClass="bg-blush-100 text-clay-600" />}
                  </div>
                  <p className={`text-sm mt-0.5 whitespace-pre-wrap break-words px-3 py-2 rounded-xl inline-block max-w-full ${
                    m.senderDisplayName === 'HelperHaven Admin'
                      ? 'bg-blush-100 border border-blush-200 text-ink-900'
                      : 'bg-white border border-cream-200 text-ink-800'
                  }`}>{m.body}</p>
                </div>
                <button
                  onClick={() => void handleToggleHide(m.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-2 py-1 rounded-full border border-cream-200 text-ink-500 hover:bg-cream-200"
                >
                  {m.hidden ? 'Unhide' : 'Hide'}
                </button>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          <div className="border-t border-cream-100 px-5 py-3 flex gap-2 bg-white">
            <input
              type="text"
              placeholder="Reply as admin…"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleReply(); } }}
              className="flex-1 border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
            />
            <button
              onClick={() => void handleReply()}
              disabled={sending || !replyBody.trim()}
              className="px-4 py-2 rounded-xl bg-sage-700 text-white text-sm font-medium hover:bg-sage-800 disabled:opacity-40 transition-colors"
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers tab ──

function HelpersTab({
  rows,
  search,
  onStatusChange,
}: {
  rows: AdminHelper[] | null;
  search: string;
  onStatusChange: (userId: string, newStatus: string) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  if (!rows) return <Loading />;
  const filtered = filterRows(rows, search, ['email', 'displayFirstName', 'fullName', 'nationality', 'currentLocation', 'status']);
  if (!filtered.length) return <Empty label="helper profiles" />;

  async function toggle(h: AdminHelper) {
    const next = h.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setPending(h.userId);
    try {
      await setUserStatus(h.userId, next);
      onStatusChange(h.userId, next);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white overflow-x-auto shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cream-100 text-xs text-ink-500 uppercase tracking-wide">
            <Th>Helper</Th>
            <Th>Nationality</Th>
            <Th>Experience</Th>
            <Th>Expected salary</Th>
            <Th>Location</Th>
            <Th>Available from</Th>
            <Th>Status</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-50">
          {filtered.map((h) => (
            <tr key={h.userId} className={`transition-colors ${h.status === 'SUSPENDED' ? 'bg-blush-50' : 'hover:bg-cream-50'}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {h.photoUrl ? (
                    <img src={h.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-cream-200 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-300 to-sage-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-medium text-ink-900">{h.displayFirstName ?? h.fullName ?? '—'}</div>
                    <div className="text-xs text-ink-400">{h.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-ink-600">{h.nationality ?? '—'}</td>
              <td className="px-4 py-3 text-ink-600">{h.yearsExperience != null ? `${h.yearsExperience} yr` : '—'}</td>
              <td className="px-4 py-3 text-ink-600 tabular-nums">
                {h.expectedSalarySgd != null ? `SGD ${h.expectedSalarySgd.toLocaleString()}` : '—'}
              </td>
              <td className="px-4 py-3 text-ink-600">{h.currentLocation ?? '—'}</td>
              <td className="px-4 py-3 text-ink-500 tabular-nums">
                {h.availableFrom ? new Date(h.availableFrom).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3">
                <Badge text={h.status.replace('_', ' ')} colorClass={STATUS_COLORS[h.status]} />
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => void toggle(h)}
                  disabled={pending === h.userId}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-40 ${
                    h.status === 'ACTIVE'
                      ? 'bg-blush-100 text-clay-600 hover:bg-blush-200'
                      : 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                  }`}
                >
                  {pending === h.userId ? '…' : h.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Employers tab ──

function EmployersTab({
  rows,
  search,
  onStatusChange,
}: {
  rows: AdminEmployer[] | null;
  search: string;
  onStatusChange: (userId: string, newStatus: string) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  if (!rows) return <Loading />;
  const filtered = filterRows(rows, search, ['email', 'fullName', 'district', 'housing', 'hiringPurpose', 'status']);
  if (!filtered.length) return <Empty label="employer profiles" />;

  async function toggle(e: AdminEmployer) {
    const next = e.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setPending(e.userId);
    try {
      await setUserStatus(e.userId, next);
      onStatusChange(e.userId, next);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white overflow-x-auto shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cream-100 text-xs text-ink-500 uppercase tracking-wide">
            <Th>Family</Th>
            <Th>Housing</Th>
            <Th>District</Th>
            <Th>Household</Th>
            <Th>Salary budget</Th>
            <Th>Purpose</Th>
            <Th>Status</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-50">
          {filtered.map((e) => (
            <tr key={e.userId} className={`transition-colors ${e.status === 'SUSPENDED' ? 'bg-blush-50' : 'hover:bg-cream-50'}`}>
              <td className="px-4 py-3">
                <div className="font-medium text-ink-900">{e.fullName ?? '—'}</div>
                <div className="text-xs text-ink-400">{e.email}</div>
              </td>
              <td className="px-4 py-3 text-ink-600">{e.housing ?? '—'}</td>
              <td className="px-4 py-3 text-ink-600">{e.district ?? '—'}</td>
              <td className="px-4 py-3 text-ink-600">
                {e.householdSize != null ? (
                  <span>
                    {e.householdSize} pax
                    {(e.numChildren ?? 0) > 0 && ` · ${e.numChildren} child`}
                    {(e.numElderly ?? 0) > 0 && ` · ${e.numElderly} elderly`}
                    {e.hasPets && ' · pets'}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-ink-600 tabular-nums">
                {e.salaryOfferSgdMin != null
                  ? `SGD ${e.salaryOfferSgdMin.toLocaleString()}–${(e.salaryOfferSgdMax ?? e.salaryOfferSgdMin).toLocaleString()}`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-ink-500 max-w-[160px] truncate">{e.hiringPurpose ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge text={e.status.replace('_', ' ')} colorClass={STATUS_COLORS[e.status]} />
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => void toggle(e)}
                  disabled={pending === e.userId}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-40 ${
                    e.status === 'ACTIVE'
                      ? 'bg-blush-100 text-clay-600 hover:bg-blush-200'
                      : 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                  }`}
                >
                  {pending === e.userId ? '…' : e.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
