import { useEffect, useState } from 'react';
import {
  fetchAdminPlacements,
  fetchPlacementDocuments,
  updateAdminPlacementStatus,
  type AdminPlacement,
  type AdminPlacementDocument,
} from '../lib/admin';
import { PLACEMENT_STEPS } from '../lib/placements';

const POLL_MS = 15_000;

const PLACEMENT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PLACEMENT_STEPS.map((s) => [s.key, s.label]),
);

const PLACEMENT_STATUS_DESC: Record<string, string> = {
  INITIATED: 'Placement just created — awaiting employer JotForm & document uploads',
  DOCS_COLLECTION: 'Admin is reviewing employer documents and preparing MOM application',
  MOM_SUBMITTED: 'MOM application submitted — awaiting IPA letter',
  IPA_ISSUED: 'IPA received — employer purchasing bond & insurance, arranging arrival',
  HELPER_ARRIVAL: 'Helper has arrived — completing SIP, medical, biometrics',
  ACTIVE: 'Placement fully active',
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
  const [placements, setPlacements] = useState<AdminPlacement[] | null>(null);
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

  function handleUpdate(updated: AdminPlacement) {
    setPlacements((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? null);
  }

  const filtered = placements
    ? filterRows(placements, search, ['employerEmail', 'employerName', 'helperEmail', 'helperName', 'status', 'engagementMode'])
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-sage-700">Admin · placements</div>
        <h1 className="serif text-4xl font-bold text-ink-900 mt-2">Manage Placements</h1>
        <p className="mt-2 text-ink-500 text-sm">
          Review documents, advance stages, and track every active placement.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-blush-100 border border-blush-200 px-4 py-3 text-sm text-clay-600">
          {error}
        </div>
      )}

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
        <div className="py-16 text-center text-ink-400 text-sm">No placements found.</div>
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
    </div>
  );
}

const DOC_LABELS: Record<string, string> = {
  NRIC_FRONT: 'NRIC — Front',
  NRIC_BACK:  'NRIC — Back',
  NOA:        'Notice of Assessment (NOA)',
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

          {/* Stage */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">
              Stage
            </div>

            {/* Progress stepper */}
            <div className="flex items-center mb-4">
              {PLACEMENT_STEPS.map((step, i) => {
                const done   = i <= stepIndex;
                const active = i === stepIndex;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ring-2 ${
                        active ? 'bg-sage-700 text-white ring-sage-300'
                        : done  ? 'bg-sage-500 text-white ring-sage-200'
                                : 'bg-cream-100 text-ink-400 ring-cream-200'
                      }`}>
                        {done && !active ? '✓' : i + 1}
                      </div>
                      <span className={`text-[9px] uppercase tracking-wide text-center leading-tight max-w-[52px] ${
                        active ? 'text-sage-800 font-semibold' : done ? 'text-sage-600' : 'text-ink-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {i < PLACEMENT_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${i < stepIndex ? 'bg-sage-400' : 'bg-cream-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-ink-400 mb-3">
              {PLACEMENT_STATUS_DESC[placement.status]}
            </p>

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

            {stageError && (
              <p className="mt-2 text-xs text-clay-600 bg-blush-50 border border-blush-100 rounded-lg px-3 py-2">
                {stageError}
              </p>
            )}
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
                            href={doc.viewUrl}
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

          {/* JWC: selected services */}
          {isJwc && placement.selectedServices && placement.selectedServices.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">
                JWC selected services
              </div>
              <div className="rounded-xl border border-cream-200 bg-white divide-y divide-cream-100 overflow-hidden">
                {placement.selectedServices.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-ink-800">
                      <span>{svc.icon}</span>
                      <span>{svc.title}</span>
                    </span>
                    <span className="tabular-nums text-ink-500">SGD {svc.priceSgd.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold bg-cream-50">
                  <span className="text-ink-700">Total</span>
                  <span className="tabular-nums text-ink-900">SGD {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* DIY: checklist for current stage */}
          {!isJwc && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">
                DIY checklist — {PLACEMENT_STATUS_LABELS[placement.status] ?? placement.status}
              </div>
              {checklist.length === 0 ? (
                <p className="text-sm text-ink-400">Placement is active — all steps complete.</p>
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

          {/* Documents — JWC, for stages other than DOCS_COLLECTION (shown in review panel above) */}
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
                            href={doc.viewUrl}
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
