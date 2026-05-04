import { useEffect, useState } from 'react';
import {
  fetchAdminPlacements,
  fetchPlacementDocuments,
  updateAdminPlacementStatus,
  type AdminPlacement,
  type AdminPlacementDocument,
} from '../lib/admin';
import {
  fetchAdminTerminations, resolveTermination,
  type AdminTerminationView,
} from '../lib/employment';
import { PLACEMENT_STEPS } from '../lib/placements';

const POLL_MS = 15_000;

const PLACEMENT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PLACEMENT_STEPS.map((s) => [s.key, s.label]),
);

const PLACEMENT_STATUS_DESC: Record<string, string> = {
  INITIATED: 'Hiring just created — awaiting employer JotForm & document uploads',
  DOCS_COLLECTION: 'Admin is reviewing employer documents and preparing MOM application',
  MOM_SUBMITTED: 'MOM application submitted — awaiting IPA letter',
  IPA_ISSUED: 'IPA received — employer purchasing bond & insurance, arranging arrival',
  HELPER_ARRIVAL: 'Helper has arrived — completing SIP, medical, biometrics',
  ACTIVE: 'Hiring fully active',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-sage-100 text-sage-700',
  INITIATED: 'bg-butter-100 text-ink-700',
  DOCS_COLLECTION: 'bg-butter-100 text-ink-700',
  MOM_SUBMITTED: 'bg-sage-50 text-sage-700',
  IPA_ISSUED: 'bg-sage-50 text-sage-700',
  HELPER_ARRIVAL: 'bg-blush-100 text-clay-600',
};


const DIY_CHECKLIST: Record<string, { label: string; note?: string }[]> = {
  INITIATED: [
    { label: 'Employer NRIC (front & back)' },
    { label: 'Employer income proof (last 3 months payslips or NOA)' },
    { label: "Helper's passport bio page" },
    { label: 'Previous employment reference letter (if applicable)' },
  ],
  DOCS_COLLECTION: [
    { label: 'Signed employment contract' },
    { label: 'MOM FDW application form completed' },
    { label: 'Security bond form signed' },
    { label: 'Medical insurance policy document' },
  ],
  MOM_SUBMITTED: [
    { label: 'IPA (In-Principle Approval) letter received from MOM', note: 'Awaiting MOM processing' },
  ],
  IPA_ISSUED: [
    { label: 'Security bond purchased (SGD 5,000 for non-Malaysian FDW)' },
    { label: 'Medical insurance purchased (min SGD 15,000 coverage)' },
    { label: "Helper's flight to Singapore arranged" },
    { label: 'SIP (Settling-In Programme) slot booked' },
  ],
  HELPER_ARRIVAL: [
    { label: 'SIP attended within first week of arrival' },
    { label: 'Medical examination completed (within 2 weeks)' },
    { label: 'Biometrics at ICA submitted (if applicable)' },
    { label: 'Work Permit card collected' },
  ],
  ACTIVE: [],
};

export default function AdminManagePlacementsPage() {
  const [tab, setTab] = useState<'placements' | 'terminations'>('placements');
  const [placements, setPlacements] = useState<AdminPlacement[] | null>(null);
  const [terminations, setTerminations] = useState<AdminTerminationView[] | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetchAdminPlacements().then(setPlacements).catch(() => setError('Could not load placements.'));
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (tab === 'terminations') {
      fetchAdminTerminations().then(setTerminations).catch(() => {});
    }
  }, [tab]);

  function handleUpdate(updated: AdminPlacement) {
    setPlacements((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? null);
  }

  const filtered = placements
    ? filterRows(placements, search, ['employerEmail', 'employerName', 'helperEmail', 'helperName', 'status', 'engagementMode'])
    : null;

  const pendingTerminations = terminations?.filter((t) => t.status === 'PENDING').length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-sage-700">Admin · hirings</div>
        <h1 className="serif text-4xl font-bold text-ink-900 mt-2">Manage Hirings</h1>
        <p className="mt-2 text-ink-500 text-sm">
          Review documents, advance stages, and track every active hiring.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-blush-100 border border-blush-200 px-4 py-3 text-sm text-clay-600">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-cream-200 mb-6 gap-1">
        <button
          onClick={() => setTab('placements')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors ${
            tab === 'placements' ? 'border-sage-600 text-sage-700' : 'border-transparent text-ink-500 hover:text-ink-700'
          }`}
        >
          Hirings
        </button>
        <button
          onClick={() => setTab('terminations')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors relative ${
            tab === 'terminations' ? 'border-sage-600 text-sage-700' : 'border-transparent text-ink-500 hover:text-ink-700'
          }`}
        >
          Termination Requests
          {pendingTerminations > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-4.5 rounded-full bg-clay-500 text-white text-[9px] font-bold px-1">
              {pendingTerminations}
            </span>
          )}
        </button>
      </div>

      {tab === 'placements' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Filter by name, email, mode, status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80 border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
            />
          </div>

          {filtered === null && (
            <div className="py-16 text-center text-ink-400 text-sm">Loading…</div>
          )}
          {filtered !== null && filtered.length === 0 && (
            <div className="py-16 text-center text-ink-400 text-sm">No hirings found.</div>
          )}
          {filtered !== null && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((p) => (
                <PlacementRow
                  key={p.id}
                  placement={p}
                  expanded={expandedId === p.id}
                  onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'terminations' && (
        <TerminationsPanel
          terminations={terminations}
          onUpdate={(updated) => setTerminations((prev) => prev?.map((t) => t.id === updated.id ? updated : t) ?? null)}
        />
      )}
    </div>
  );
}

function TerminationsPanel({
  terminations,
  onUpdate,
}: {
  terminations: AdminTerminationView[] | null;
  onUpdate: (t: AdminTerminationView) => void;
}) {
  if (terminations === null) {
    return <div className="py-12 text-center text-sm text-ink-400">Loading…</div>;
  }
  if (terminations.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-ink-400">
        No termination requests yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {terminations.map((t) => (
        <TerminationCard key={t.id} item={t} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

function TerminationCard({ item, onUpdate }: { item: AdminTerminationView; onUpdate: (t: AdminTerminationView) => void }) {
  const [notes, setNotes] = useState(item.adminNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveNotes() {
    setSaving(true);
    try {
      const updated = await resolveTermination(item.id, notes, false);
      onUpdate(updated);
    } catch { setError('Failed to save notes'); }
    setSaving(false);
  }

  async function handleResolve() {
    if (!confirm('Mark this termination as resolved? This will terminate the placement.')) return;
    setSaving(true);
    try {
      const updated = await resolveTermination(item.id, notes, true);
      onUpdate(updated);
    } catch { setError('Failed to resolve'); }
    setSaving(false);
  }

  const isPending = item.status === 'PENDING';

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden shadow-soft ${isPending ? 'border-red-200' : 'border-cream-200'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${isPending ? 'bg-red-100 text-red-700' : 'bg-sage-100 text-sage-700'}`}>
                {item.status}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cream-200 text-ink-600">
                {item.engagementMode}
              </span>
            </div>
            <p className="text-sm font-medium text-ink-900">
              {item.employerName} → {item.helperName}
            </p>
            <p className="text-xs text-ink-400 mt-0.5">{relTime(item.createdAt)}</p>
          </div>
          {item.resolvedAt && (
            <span className="text-xs text-ink-400">Resolved {relTime(item.resolvedAt)}</span>
          )}
        </div>

        {item.reason && (
          <div className="mt-3 rounded-xl bg-cream-50 border border-cream-200 px-3 py-2">
            <p className="text-xs font-medium text-ink-500 mb-0.5">Reason</p>
            <p className="text-sm text-ink-800">{item.reason}</p>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-3">
          <label className="block text-xs font-medium text-ink-600 mb-1">Admin notes (contact / mediation notes)</label>
          <textarea
            className="w-full border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-sage-400"
            placeholder="Record your mediation notes here…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isPending}
          />
        </div>

        {isPending && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => void handleSaveNotes()}
              disabled={saving}
              className="flex-1 py-2 rounded-xl border border-cream-300 text-sm font-medium text-ink-700 hover:bg-cream-50 disabled:opacity-50"
            >
              Save Notes
            </button>
            <button
              onClick={() => void handleResolve()}
              disabled={saving}
              className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
            >
              Resolve & Terminate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const DOC_LABELS: Record<string, string> = {
  NRIC_FRONT: 'NRIC — Front',
  NRIC_BACK:  'NRIC — Back',
  NOA:        'Notice of Assessment (NOA)',
  PASSPORT:   'Passport',
};

function PlacementRow({
  placement,
  expanded,
  onToggle,
  onUpdate,
}: {
  placement: AdminPlacement;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (p: AdminPlacement) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [docs, setDocs] = useState<AdminPlacementDocument[] | null>(null);

  async function changeStatus(newStatus: string) {
    if (saving || newStatus === placement.status) return;
    setSaving(true);
    setStageError(null);
    try {
      const updated = await updateAdminPlacementStatus(placement.id, newStatus);
      onUpdate(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update stage.';
      setStageError(msg);
    } finally {
      setSaving(false);
    }
  }

  const isJwc = placement.engagementMode === 'JWC';
  const checklist = DIY_CHECKLIST[placement.status] ?? [];
  const total = placement.selectedServices?.reduce((sum, s) => sum + s.priceSgd, 0) ?? 0;
  const stepIndex  = PLACEMENT_STEPS.findIndex((s) => s.key === placement.status);
  const prevStatus = PLACEMENT_STEPS[stepIndex - 1]?.key;
  const nextStatus = PLACEMENT_STEPS[stepIndex + 1]?.key;

  useEffect(() => {
    if (expanded && isJwc && docs === null) {
      fetchPlacementDocuments(placement.id).then(setDocs).catch(() => setDocs([]));
    }
  }, [expanded, isJwc, placement.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden shadow-soft">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-cream-50 transition-colors"
      >
        <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-ink-400 mb-0.5">Family</div>
            <div className="font-medium text-ink-900 text-sm truncate">
              {placement.employerName || placement.employerEmail}
            </div>
            {placement.employerName && (
              <div className="text-xs text-ink-400 truncate">{placement.employerEmail}</div>
            )}
          </div>
          <div>
            <div className="text-xs text-ink-400 mb-0.5">Helper</div>
            <div className="font-medium text-ink-900 text-sm truncate">
              {placement.helperName || placement.helperEmail}
            </div>
            {placement.helperName && (
              <div className="text-xs text-ink-400 truncate">{placement.helperEmail}</div>
            )}
          </div>
          <div>
            <div className="text-xs text-ink-400 mb-0.5">Mode</div>
            <Badge
              text={isJwc ? 'JWC Employment Services' : 'DIY'}
              colorClass={isJwc ? 'bg-sage-100 text-sage-700' : 'bg-cream-200 text-ink-600'}
            />
          </div>
          <div>
            <div className="text-xs text-ink-400 mb-0.5">Stage</div>
            <Badge
              text={PLACEMENT_STATUS_LABELS[placement.status] ?? placement.status}
              colorClass={STATUS_COLORS[placement.status]}
            />
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-ink-400 hidden md:block">
          <div>{relTime(placement.createdAt)}</div>
          <div className="mt-0.5 text-ink-300">upd {relTime(placement.updatedAt)}</div>
        </div>
        <span className="shrink-0 text-ink-400 text-xs ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Detail panel */}
      {expanded && (
        <div className="border-t border-cream-100 px-5 py-5 space-y-5 bg-cream-50/40">

          {/* Stage + services workflow */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">
              Workflow
            </div>

            <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden mb-3">
              {PLACEMENT_STEPS.map((step, i) => {
                const isPast   = i < stepIndex;
                const isActive = i === stepIndex;
                const isFuture = i > stepIndex;
                const stageSvcs = isJwc
                  ? (placement.selectedServices ?? []).filter((s) => s.workflowStage === step.key)
                  : [];

                return (
                  <div
                    key={step.key}
                    className={`border-b border-cream-100 last:border-0 ${isActive ? 'bg-sage-50/60' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => void changeStatus(step.key)}
                      disabled={saving || isActive}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors group ${
                        isActive
                          ? 'cursor-default'
                          : isPast
                          ? 'hover:bg-sage-50 cursor-pointer'
                          : 'hover:bg-cream-50 cursor-pointer'
                      } disabled:pointer-events-none`}
                    >
                      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 shrink-0 transition-all ${
                        isActive ? 'bg-sage-700 text-white ring-sage-300 shadow-sm'
                        : isPast  ? 'bg-sage-400 text-white ring-sage-200'
                                  : 'bg-cream-100 text-ink-400 ring-cream-200 group-hover:ring-sage-300'
                      }`}>
                        {isPast ? '✓' : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${
                            isActive ? 'text-sage-900'
                            : isPast  ? 'text-sage-600'
                                      : 'text-ink-400'
                          }`}>
                            {step.label}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sage-200 text-sage-800 uppercase tracking-wide">
                              Current
                            </span>
                          )}
                          {!isActive && !saving && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity ${
                              isPast ? 'bg-cream-200 text-ink-500' : 'bg-sage-100 text-sage-700'
                            }`}>
                              {isPast ? 'Revert' : 'Advance'}
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <p className="text-[11px] text-ink-400 mt-0.5 leading-snug">
                            {PLACEMENT_STATUS_DESC[placement.status]}
                          </p>
                        )}
                        {stageSvcs.length > 0 && (
                          <div className={`mt-1.5 space-y-0.5 ${isFuture ? 'opacity-40' : ''}`}>
                            {stageSvcs.map((svc) => (
                              <div key={svc.id} className="flex items-center gap-1.5">
                                <span className="text-xs shrink-0">{svc.icon}</span>
                                <span className="text-[11px] text-ink-600 flex-1 truncate">{svc.title}</span>
                                <span className="text-[11px] text-ink-400 tabular-nums shrink-0">
                                  SGD {svc.priceSgd.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}

              {/* Services with no stage (ongoing) */}
              {isJwc && (() => {
                const always = (placement.selectedServices ?? []).filter((s) => !s.workflowStage);
                if (always.length === 0) return null;
                return (
                  <div className="border-t border-cream-100 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 bg-cream-100 text-ink-400 ring-cream-200 shrink-0">
                        ∞
                      </div>
                      <span className="text-sm font-semibold text-ink-400">Included throughout</span>
                    </div>
                    <div className="pl-9 space-y-0.5">
                      {always.map((svc) => (
                        <div key={svc.id} className="flex items-center gap-1.5">
                          <span className="text-xs shrink-0">{svc.icon}</span>
                          <span className="text-[11px] text-ink-600 flex-1 truncate">{svc.title}</span>
                          <span className="text-[11px] text-ink-400 tabular-nums shrink-0">
                            SGD {svc.priceSgd.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {isJwc && (placement.selectedServices ?? []).length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-sage-50 border-t border-sage-100">
                  <span className="text-xs font-semibold text-ink-700">Total</span>
                  <span className="text-sm font-bold text-sage-900 tabular-nums">
                    SGD {total.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {stageError && (
              <p className="mb-2 text-xs text-clay-600 bg-blush-50 border border-blush-100 rounded-lg px-3 py-2">
                {stageError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => prevStatus && void changeStatus(prevStatus)}
                disabled={saving || !prevStatus}
                className="flex-1 py-2 rounded-xl border border-cream-300 bg-white text-sm font-medium text-ink-700 hover:border-sage-400 hover:text-sage-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                ← {prevStatus ? PLACEMENT_STATUS_LABELS[prevStatus] : 'Previous'}
              </button>
              <button
                onClick={() => nextStatus && void changeStatus(nextStatus)}
                disabled={saving || !nextStatus}
                className="flex-1 py-2 rounded-xl bg-sage-800 text-white text-sm font-medium hover:bg-sage-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                {nextStatus ? PLACEMENT_STATUS_LABELS[nextStatus] : 'Next'} →
              </button>
            </div>
          </div>

          {/* Document review panel — JWC DOCS_COLLECTION only */}
          {isJwc && placement.status === 'DOCS_COLLECTION' && (
            <div className="rounded-2xl border-2 border-butter-200 bg-butter-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-butter-200">
                <div className="text-xs font-semibold uppercase tracking-widest text-ink-700 mb-0.5">
                  Document review
                </div>
                <p className="text-xs text-ink-500">
                  Review the submitted documents, then submit to MOM or reject for re-submission.
                </p>
              </div>

              {docs === null ? (
                <div className="px-4 py-4 text-xs text-ink-400">Loading documents…</div>
              ) : (
                <div className="bg-white divide-y divide-cream-100">
                  {(['NRIC_FRONT', 'NRIC_BACK', 'NOA'] as const).map((type) => {
                    const doc = docs.find((d) => d.docType === type);
                    return (
                      <div key={type} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-ink-800">{DOC_LABELS[type]}</div>
                          {doc ? (
                            <div className="text-xs text-ink-400 mt-0.5">
                              {doc.originalName} · {(doc.sizeBytes / 1024).toFixed(0)} KB · {relTime(doc.uploadedAt)}
                            </div>
                          ) : (
                            <div className="text-xs text-clay-500 mt-0.5 italic">Not uploaded</div>
                          )}
                        </div>
                        {doc ? (
                          <a
                            href={doc.viewUrl ?? ''}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 hover:bg-sage-200 font-medium transition-colors"
                          >
                            View
                          </a>
                        ) : (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blush-100 text-clay-600">
                            Missing
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* DIY: checklist for current stage */}
          {!isJwc && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">
                DIY checklist — {PLACEMENT_STATUS_LABELS[placement.status] ?? placement.status}
              </div>
              {checklist.length === 0 ? (
                <p className="text-sm text-ink-400">Hiring is active — all steps complete.</p>
              ) : (
                <ul className="space-y-2">
                  {checklist.map((item) => (
                    <li key={item.label} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 shrink-0 w-4 h-4 rounded border-2 border-cream-300 bg-white" />
                      <span className="text-ink-800">
                        {item.label}
                        {item.note && (
                          <span className="ml-1.5 text-ink-400 text-xs">({item.note})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Employer documents — JWC, for stages other than DOCS_COLLECTION (shown in review panel above) */}
          {isJwc && placement.status !== 'DOCS_COLLECTION' && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">
                Employer documents
              </div>
              {docs === null ? (
                <div className="text-xs text-ink-400 py-2">Loading documents…</div>
              ) : (
                <div className="rounded-xl border border-cream-200 bg-white divide-y divide-cream-100 overflow-hidden">
                  {(['NRIC_FRONT', 'NRIC_BACK', 'NOA'] as const).map((type) => {
                    const doc = docs.find((d) => d.docType === type);
                    return (
                      <div key={type} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-ink-800">{DOC_LABELS[type]}</div>
                          {doc ? (
                            <div className="text-xs text-ink-400 mt-0.5">
                              {doc.originalName} · {(doc.sizeBytes / 1024).toFixed(0)} KB · {relTime(doc.uploadedAt)}
                            </div>
                          ) : (
                            <div className="text-xs text-ink-400 mt-0.5 italic">Not yet uploaded</div>
                          )}
                        </div>
                        {doc ? (
                          <a
                            href={doc.viewUrl ?? ''}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 hover:bg-sage-200 font-medium transition-colors"
                          >
                            View
                          </a>
                        ) : (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-butter-100 text-ink-600">
                            Pending
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Helper documents (passport) — always shown once docs are loaded */}
          {docs !== null && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                  Helper documents
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-ink-400">Family</span>
                  {placement.employerDocsSubmittedAt ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                      ✓ submitted
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-butter-100 text-ink-600">
                      pending
                    </span>
                  )}
                  <span className="text-[10px] text-ink-400 ml-1">Helper</span>
                  {placement.helperDocsSubmittedAt ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                      ✓ submitted
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-butter-100 text-ink-600">
                      pending
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-cream-200 bg-white divide-y divide-cream-100 overflow-hidden">
                {(['PASSPORT'] as const).map((type) => {
                  const doc = docs.find((d) => d.docType === type);
                  return (
                    <div key={type} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium text-ink-800">{DOC_LABELS[type]}</div>
                        {doc ? (
                          <div className="text-xs text-ink-400 mt-0.5">
                            {doc.originalName} · {(doc.sizeBytes / 1024).toFixed(0)} KB · {relTime(doc.uploadedAt)}
                          </div>
                        ) : (
                          <div className="text-xs text-ink-400 mt-0.5 italic">Not yet uploaded</div>
                        )}
                      </div>
                      {doc ? (
                        <a
                          href={doc.viewUrl ?? ''}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 hover:bg-sage-200 font-medium transition-colors"
                        >
                          View
                        </a>
                      ) : (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-butter-100 text-ink-600">
                          Pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function Badge({ text, colorClass }: { text: string; colorClass?: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${colorClass ?? 'bg-cream-200 text-ink-600'}`}
    >
      {text}
    </span>
  );
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
