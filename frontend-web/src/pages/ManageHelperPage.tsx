import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../lib/auth';
import {
  createPlacement,
  listPlacements,
  fetchPlacementDocuments,
  uploadPlacementDocument,
  submitPlacementDocuments,
  submitHelperDocuments,
  setIdealStartDate,
  setMemberDocCount,
  PLACEMENT_STEPS,
  type PlacementView,
  type PlacementDocumentView,
  type PlacementDocType,
} from '../lib/placements';
import { listServices, type ServiceItem } from '../lib/services';
import { asMessage } from '../lib/api';

export default function ManageHelperPage() {
  const me = useAuthStore((s) => s.user);
  const nav = useNavigate();
  const [params] = useSearchParams();
  const pendingOfferId = params.get('offer');

  const [items, setItems] = useState<PlacementView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlacements().then(setItems).catch(() => setItems([]));
  }, []);

  const isEmployer = me?.role === 'EMPLOYER';

  if (pendingOfferId && isEmployer) {
    return (
      <EngagementGateway
        offerId={pendingOfferId}
        onDone={(p) => {
          nav('/manage', { replace: true });
          setItems((prev) => (prev ? [p, ...prev] : [p]));
        }}
        onError={setError}
        error={error}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-sage-700">
          {isEmployer ? 'Employer' : 'Helper'} &middot; hirings
        </div>
        <h1 className="serif text-4xl font-bold text-ink-900 mt-2">My Hiring</h1>
        <p className="mt-2 text-ink-500 text-sm max-w-xl">
          {isEmployer
            ? "Track the progress of every helper you've hired or are in the process of hiring."
            : 'See your active and upcoming hirings.'}
        </p>
      </div>

      {items === null ? (
        <div className="text-center text-ink-500 py-20">Loading&hellip;</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-cream-200 bg-white p-10 text-center shadow-soft">
          <p className="text-ink-700 mb-2">No hirings yet.</p>
          <p className="text-sm text-ink-500 mb-6">
            {isEmployer
              ? 'Once you accept an offer and start a hiring, it will appear here.'
              : 'Once an employer starts the hiring, it will appear here.'}
          </p>
          <Link to="/matches" className="text-sm text-sage-700 hover:text-sage-900 font-medium">
            Browse matches &rarr;
          </Link>
        </div>
      ) : (
        (() => {
          const active     = items.filter((p) => p.status === 'ACTIVE');
          const inProgress = items.filter((p) => p.status !== 'ACTIVE' && p.status !== 'TERMINATED');
          const terminated = items.filter((p) => p.status === 'TERMINATED');
          const hasLive = active.length > 0 || inProgress.length > 0;
          return (
            <div className="space-y-3">
              {/* Active hirings — minimized pill */}
              {active.map((p) => (
                <ActiveHiringMini key={p.id} placement={p} isEmployer={isEmployer} />
              ))}
              {/* In-progress hirings — full card */}
              {inProgress.map((p) => (
                <PlacementCard
                  key={p.id}
                  placement={p}
                  isEmployer={isEmployer}
                  onStatusChange={(id, status) =>
                    setItems((prev) => prev?.map((x) => x.id === id ? { ...x, status } : x) ?? null)
                  }
                />
              ))}
              {/* Past hirings — terminated */}
              {terminated.length > 0 && (
                <>
                  {hasLive && (
                    <div className="pt-4 pb-1">
                      <p className="text-xs uppercase tracking-widest text-ink-400 font-medium">Past hirings</p>
                    </div>
                  )}
                  {terminated.map((p) => (
                    <TerminatedHiringCard key={p.id} placement={p} isEmployer={isEmployer} />
                  ))}
                </>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}

// ── Engagement gateway ────────────────────────────────────────────────────────

function EngagementGateway({
  offerId,
  onDone,
  onError,
  error,
}: {
  offerId: string;
  onDone: (p: PlacementView) => void;
  onError: (msg: string) => void;
  error: string | null;
}) {
  const [mode, setMode] = useState<'JWC' | 'DIY' | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listServices().then((svcs) => {
      setServices(svcs);
      setSelected(new Set(svcs.map((s) => s.id)));
    });
  }, []);

  function toggleService(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = services.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.priceSgd, 0);
  const canConfirm = mode === 'DIY' || (mode === 'JWC' && selected.size > 0);

  async function confirm() {
    if (!mode || !canConfirm || submitting) return;
    setSubmitting(true);
    try {
      const serviceIds = mode === 'JWC' ? Array.from(selected) : [];
      const p = await createPlacement(offerId, mode, serviceIds);
      onDone(p);
    } catch (err) {
      onError(asMessage(err, 'Could not initiate placement. Please try again.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-sage-700">Hiring &middot; next steps</div>
        <h1 className="serif text-3xl font-bold text-ink-900 mt-2">Offer accepted</h1>
        <p className="mt-2 text-ink-500 text-sm">
          Choose how you&apos;d like to handle the hiring process and work permit.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-clay-500/10 border border-clay-500/30 px-4 py-3 text-sm text-clay-700">
          {error}
        </div>
      )}

      {/*
        Option cards are plain <div> elements — not <button> — so that the service
        checkboxes inside (when JWC is selected) are never nested inside a button,
        which is invalid HTML and causes browsers to fire unexpected click events.
      */}
      <div className="space-y-3">

        {/* JWC header card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setMode('JWC')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('JWC'); }}
          className={`rounded-3xl border-2 p-5 md:p-6 cursor-pointer transition-colors select-none ${
            mode === 'JWC'
              ? 'border-sage-500 bg-sage-50'
              : 'border-cream-200 bg-white hover:border-sage-400/60'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-sage-100 flex items-center justify-center text-xl shrink-0">
              {'🤝'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="serif text-base font-bold text-ink-900">Engage JWC Employment Services</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sage-100 text-sage-800 uppercase tracking-wide">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                Let our licensed EA team handle the entire process &mdash; MOM application, insurance,
                security bond, SIP, and more.
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
              mode === 'JWC' ? 'border-sage-500 bg-sage-500' : 'border-cream-300'
            }`}>
              {mode === 'JWC' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
        </div>

        {/*
          Service picker lives OUTSIDE the card div so checkboxes are never
          nested inside an interactive container. Only shown when JWC is selected.
        */}
        {mode === 'JWC' && (
          <div className="rounded-3xl border-2 border-sage-400/40 bg-white p-5 space-y-3">
            <p className="text-xs font-semibold text-ink-700 uppercase tracking-wide">Choose services</p>
            <div className="space-y-2">
              {services.map((svc) => {
                const checked = selected.has(svc.id);
                return (
                  <label
                    key={svc.id}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                      checked ? 'border-sage-400/50 bg-sage-50' : 'border-cream-200 bg-cream-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(svc.id)}
                      className="accent-sage-700 w-4 h-4 shrink-0"
                    />
                    <span className="text-lg shrink-0 leading-none">{svc.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink-900">{svc.title}</p>
                      <p className="text-[11px] text-ink-500 leading-snug">{svc.description}</p>
                    </div>
                    <span className={`text-xs font-semibold tabular-nums shrink-0 ${checked ? 'text-sage-800' : 'text-ink-400'}`}>
                      SGD {svc.priceSgd.toLocaleString()}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-sage-50 border border-sage-200 px-4 py-3">
              <span className="text-xs text-ink-600">
                {selected.size} service{selected.size !== 1 ? 's' : ''} selected
                &nbsp;&middot;&nbsp;one-time fee payable on IPA issuance
              </span>
              <span className="text-sm font-bold text-sage-900 tabular-nums">
                SGD {total.toLocaleString()}
              </span>
            </div>

            <div className="rounded-2xl bg-cream-50 border border-cream-200 px-4 py-3 space-y-0.5">
              <p className="text-xs font-semibold text-ink-700">Terms</p>
              <ul className="text-[11px] text-ink-500 space-y-0.5 list-disc list-inside">
                <li>MOM EA Licence No. 25C0000 &middot; JWC Employment Services Pte Ltd</li>
                <li>Full refund if MOM rejects the application</li>
                <li>Replacement guarantee: free replacement within 3 months if helper resigns in month 1</li>
                <li>
                  By confirming, you agree to our{' '}
                  <a href="/terms" className="text-sage-700 underline">Terms of Service</a>
                </li>
              </ul>
            </div>

            {selected.size === 0 && (
              <p className="text-xs text-clay-600 text-center">Select at least one service to continue.</p>
            )}
          </div>
        )}

        {/* DIY card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setMode('DIY')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMode('DIY'); }}
          className={`rounded-3xl border-2 p-5 cursor-pointer transition-colors select-none ${
            mode === 'DIY'
              ? 'border-sage-500 bg-sage-50'
              : 'border-cream-200 bg-white hover:border-sage-400/60'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-cream-100 flex items-center justify-center text-xl shrink-0">
              {'🛠️'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="serif text-base font-bold text-ink-900">Handle it myself (DIY)</span>
              <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                Submit the MOM work permit application yourself. We&apos;ll provide a step-by-step checklist and links.
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
              mode === 'DIY' ? 'border-sage-500 bg-sage-500' : 'border-cream-300'
            }`}>
              {mode === 'DIY' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
        </div>

      </div>

      <button
        type="button"
        onClick={() => void confirm()}
        disabled={!canConfirm || submitting}
        className="w-full py-3.5 rounded-full bg-sage-900 text-cream-100 font-medium text-sm hover:bg-sage-800 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Setting up…' : 'Confirm & start hiring →'}
      </button>
    </div>
  );
}

// ── Stage descriptions shown to family & helper ───────────────────────────────

const STAGE_DESC: Record<string, string> = {
  INITIATED:        'Hiring created — awaiting document uploads from both parties.',
  DOCS_COLLECTION:  'Documents received — our team is reviewing and preparing the MOM application.',
  MOM_ACKNOWLEDGE:  'Action required — please check your email for a message from MOM and complete the acknowledgement.',
  MOM_SUBMITTED:    'MOM work permit application submitted — awaiting In-Principle Approval (IPA).',
  IPA_ISSUED:       'IPA received — employer to purchase bond & insurance and arrange helper\'s arrival.',
  HELPER_ARRIVAL:   'Helper has arrived — completing Settling-In Programme, medical exam, and biometrics.',
  ACTIVE:           'Hiring fully active. Welcome to the family!',
};

// ── Active hiring — minimized pill ───────────────────────────────────────────

function ActiveHiringMini({ placement: p, isEmployer }: { placement: PlacementView; isEmployer: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-sage-50/50 px-4 py-3">
      <PersonAvatar src={p.helperPhotoUrl} name={p.helperDisplayName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-800 truncate">
            {isEmployer ? p.helperDisplayName : (p.employerDisplayName ?? 'Family')}
          </span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-sage-200 text-sage-800 uppercase tracking-wide shrink-0">
            Active
          </span>
        </div>
        <p className="text-[11px] text-ink-400 mt-0.5">Employment in progress — managed in My Employment</p>
      </div>
      <Link
        to="/employment"
        className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-sage-700 text-white hover:bg-sage-800 transition-colors font-medium"
      >
        View →
      </Link>
    </div>
  );
}

// ── Terminated hiring — compact history card ──────────────────────────────────

function TerminatedHiringCard({ placement: p, isEmployer }: { placement: PlacementView; isEmployer: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50/50 px-4 py-3 opacity-70">
      <PersonAvatar src={p.helperPhotoUrl} name={p.helperDisplayName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-600 truncate">
            {isEmployer ? p.helperDisplayName : (p.employerDisplayName ?? 'Family')}
          </span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-cream-200 text-ink-500 uppercase tracking-wide shrink-0">
            Ended
          </span>
        </div>
        <p className="text-[11px] text-ink-400 mt-0.5">
          {p.engagementMode === 'JWC' ? 'JWC Employment Services' : 'DIY'} &middot; Started{' '}
          {new Date(p.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

// ── Placement card ────────────────────────────────────────────────────────────

function PlacementCard({
  placement: p,
  isEmployer,
  onStatusChange,
}: {
  placement: PlacementView;
  isEmployer: boolean;
  onStatusChange: (id: string, status: PlacementView['status']) => void;
}) {
  const hasMomService = p.selectedServices.some((s) => s.workflowStage === 'MOM_SUBMITTED');
  const visibleSteps = PLACEMENT_STEPS.filter(
    (step) => (step.key !== 'MOM_ACKNOWLEDGE' && step.key !== 'MOM_SUBMITTED') || hasMomService,
  );
  const stepIndex = visibleSteps.findIndex((s) => s.key === p.status);
  const mode = p.engagementMode;

  const [docs, setDocs] = useState<PlacementDocumentView[] | null>(null);
  const [employerDocsSubmittedAt, setEmployerDocsSubmittedAt] = useState<string | null>(p.employerDocsSubmittedAt);
  const [helperDocsSubmittedAt, setHelperDocsSubmittedAt] = useState<string | null>(p.helperDocsSubmittedAt);
  const [idealStartDateInput, setIdealStartDateInput] = useState(p.idealStartDate ?? '');
  const [savingStartDate, setSavingStartDate] = useState(false);
  const [idealStartDateSaved, setIdealStartDateSaved] = useState<string | null>(p.idealStartDate);

  const minStartDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d.toISOString().slice(0, 10);
  })();

  async function handleSaveIdealStartDate() {
    if (!idealStartDateInput || savingStartDate) return;
    setSavingStartDate(true);
    try {
      await setIdealStartDate(p.id, idealStartDateInput);
      setIdealStartDateSaved(idealStartDateInput);
    } finally {
      setSavingStartDate(false);
    }
  }

  useEffect(() => {
    fetchPlacementDocuments(p.id).then(setDocs).catch(() => setDocs([]));
  }, [p.id]);

  function handleDocUploaded(doc: PlacementDocumentView) {
    setDocs((prev) => {
      const next = (prev ?? []).filter((d) => d.docType !== doc.docType);
      return [...next, doc];
    });
  }

  const employerDocs = (docs ?? []).filter((d) => d.uploadedByRole === 'EMPLOYER');
  const helperDocs   = (docs ?? []).filter((d) => d.uploadedByRole === 'HELPER');

  return (
    <div className="rounded-3xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft space-y-5">
      <div className="flex items-center gap-4">
        <PersonAvatar src={p.helperPhotoUrl} name={p.helperDisplayName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="serif text-lg font-bold text-ink-900">
              {isEmployer ? p.helperDisplayName : (p.employerDisplayName ?? 'Family')}
            </h2>
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
              mode === 'JWC' ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-ink-700'
            }`}>
              {mode === 'JWC' ? 'JWC Employment Services' : 'DIY'}
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Started {new Date(p.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <Link
          to="/chats"
          className="shrink-0 text-xs px-3 py-2 rounded-full border border-cream-200 text-ink-700 hover:border-sage-500 transition-colors"
        >
          Open chat
        </Link>
      </div>

      {/* Progress stepper with services shown under their stage */}
      <div className="flex items-start">
        {visibleSteps.map((step, i) => {
          const done   = i <= stepIndex;
          const active = i === stepIndex;
          const stageSvcs = mode === 'JWC'
            ? p.selectedServices.filter((s) => s.workflowStage === step.key)
            : [];
          return (
            <div key={step.key} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 min-w-0 flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ring-2 shrink-0 ${
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
                {stageSvcs.length > 0 && (
                  <div className={`flex flex-col items-center gap-1 mt-1 ${i > stepIndex ? 'opacity-40' : ''}`}>
                    {stageSvcs.map((svc) => (
                      <div key={svc.id} className="flex flex-col items-center gap-0.5">
                        <span className="text-base leading-none">{svc.icon}</span>
                        <span
                          className="text-[9px] text-ink-500 text-center leading-tight w-[52px] truncate"
                          title={svc.title}
                        >
                          {svc.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {i < visibleSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mt-3.5 rounded shrink-0 ${i < stepIndex ? 'bg-sage-400' : 'bg-cream-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current stage description */}
      {STAGE_DESC[p.status] && (
        <div className="rounded-xl bg-cream-50 border border-cream-200 px-3.5 py-2.5 flex items-start gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 shrink-0 mt-0.5">Now</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-700 leading-relaxed">{STAGE_DESC[p.status]}</p>
            {p.idealStartDate && (
              <p className="text-[11px] text-ink-500 mt-1">
                Ideal start date:{' '}
                <span className="font-medium text-ink-700">
                  {new Date(p.idealStartDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* MOM Acknowledge action banner — shown to employer on JWC placements only */}
      {p.status === 'MOM_ACKNOWLEDGE' && isEmployer && mode === 'JWC' && (
        <div className="rounded-2xl border-2 border-butter-300 bg-butter-50 px-5 py-4 space-y-2">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">📧</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">Action required — check your email from MOM</p>
              <p className="text-xs text-ink-700 mt-1 leading-relaxed">
                The Ministry of Manpower (MOM) has sent you an email asking you to acknowledge that{' '}
                <span className="font-semibold">JWC Employment Service</span> will represent you for the
                Work Permit application. Please complete the acknowledgement as soon as possible to avoid
                delays.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-butter-200 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-ink-800">Steps to complete:</p>
            <ol className="space-y-1 text-xs text-ink-700 list-decimal list-inside">
              <li>Open the email from <span className="font-medium">mom.gov.sg</span> in your inbox (check spam if not found)</li>
              <li>Click the acknowledgement link in the email</li>
              <li>Log in with your Singpass and confirm JWC as your appointed EA</li>
            </ol>
          </div>
          <p className="text-[11px] text-ink-500">
            Our team will be notified once MOM confirms the acknowledgement and will advance your application automatically.
          </p>
        </div>
      )}

      {/* Ideal start date — employer sets this at INITIATED for JWC */}
      {isEmployer && mode === 'JWC' && p.status === 'INITIATED' && (
        <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3 space-y-2">
          <div>
            <p className="text-sm font-medium text-ink-900">Ideal employment start date</p>
            <p className="text-xs text-ink-500 mt-0.5">
              When would you like the helper to start? Earliest is 3 weeks from today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              min={minStartDate}
              value={idealStartDateInput}
              onChange={(e) => setIdealStartDateInput(e.target.value)}
              className="flex-1 border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
            />
            <button
              onClick={() => void handleSaveIdealStartDate()}
              disabled={!idealStartDateInput || savingStartDate || idealStartDateInput === idealStartDateSaved}
              className="shrink-0 px-4 py-2 rounded-xl bg-sage-800 text-white text-sm font-medium hover:bg-sage-700 disabled:opacity-40 transition-colors"
            >
              {savingStartDate ? 'Saving…' : idealStartDateSaved ? 'Update' : 'Save'}
            </button>
          </div>
          {idealStartDateSaved && (
            <p className="text-[11px] text-sage-700">
              Saved:{' '}
              {new Date(idealStartDateSaved).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {/* Services with no stage (e.g. Ongoing Support) — shown below the stepper */}
      {mode === 'JWC' && (() => {
        const always = p.selectedServices.filter((s) => !s.workflowStage);
        if (always.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-2">
            {always.map((svc) => (
              <span
                key={svc.id}
                title={svc.title}
                className="inline-flex items-center gap-1.5 text-[10px] text-ink-600 bg-cream-100 rounded-full px-2.5 py-1"
              >
                <span>{svc.icon}</span>
                {svc.title}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Employer: JWC doc upload + helper passport info */}
      {isEmployer && mode === 'JWC' && (
        <>
          <JwcDocumentSection
            placementId={p.id}
            status={p.status}
            memberDocCount={p.memberDocCount}
            docs={employerDocs}
            employerDocsSubmittedAt={employerDocsSubmittedAt}
            onDocUploaded={handleDocUploaded}
            onMemberCountChange={() => {}}
            onSubmitted={(submittedAt, newStatus) => {
              setEmployerDocsSubmittedAt(submittedAt);
              if (newStatus !== p.status) onStatusChange(p.id, newStatus as PlacementView['status']);
            }}
          />
          <PartnerDocsPanel docs={helperDocs} partnerLabel="Helper" docsLoaded={docs !== null} />
        </>
      )}

      {/* Employer: DIY checklist + helper passport info */}
      {isEmployer && mode === 'DIY' && (
        <>
          <div className="rounded-2xl bg-cream-50 border border-cream-200 px-4 py-3 space-y-2">
            <p className="text-sm font-medium text-ink-900">DIY checklist</p>
            <ul className="space-y-1.5">
              {DIY_STEPS.map((s) => (
                <li key={s} className="flex items-start gap-2 text-xs text-ink-700">
                  <span className="mt-0.5 w-3.5 h-3.5 rounded border border-cream-300 bg-white shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
            <a
              href="https://www.mom.gov.sg/passes-and-permits/work-permit-for-foreign-domestic-worker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-xs text-sage-700 font-medium hover:text-sage-900"
            >
              MOM FDW guide &rarr;
            </a>
          </div>
          <PartnerDocsPanel docs={helperDocs} partnerLabel="Helper" docsLoaded={docs !== null} />
        </>
      )}

      {/* Helper: passport upload + employer docs info */}
      {!isEmployer && (
        <>
          {mode === 'JWC' && (
            <div className="rounded-2xl bg-sage-50 border border-sage-400/20 px-4 py-3 flex items-start gap-3">
              <span className="text-lg shrink-0">{'🤝'}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-sage-900 mb-0.5">JWC Employment Services</p>
                <p className="text-xs text-ink-600 leading-relaxed">
                  The family is using JWC Employment Services to handle the work permit.
                </p>
              </div>
            </div>
          )}
          <HelperPassportSection
            placementId={p.id}
            status={p.status}
            mode={p.engagementMode}
            docs={helperDocs}
            helperDocsSubmittedAt={helperDocsSubmittedAt}
            onDocUploaded={handleDocUploaded}
            onSubmitted={(submittedAt, newStatus) => {
              setHelperDocsSubmittedAt(submittedAt);
              if (newStatus !== p.status) onStatusChange(p.id, newStatus as PlacementView['status']);
            }}
          />
          {mode === 'JWC' && (
            <PartnerDocsPanel docs={employerDocs} partnerLabel="Family" docsLoaded={docs !== null} />
          )}
        </>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function PersonAvatar({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const cls = size === 'sm'
    ? 'w-8 h-8 rounded-xl text-sm'
    : 'w-14 h-14 rounded-2xl text-lg';
  if (src) {
    return <img src={src} alt="" className={`${cls} object-cover bg-cream-200 shrink-0`} />;
  }
  return (
    <div className={`${cls} bg-sage-50 text-sage-900 flex items-center justify-center font-semibold shrink-0`}>
      {initials || '·'}
    </div>
  );
}

// Update this URL to the actual JotForm employer intake form link
const JOTFORM_URL = 'https://form.jotform.com/helperhaven/employer-intake';

const BASE_DOC_SLOTS: { type: PlacementDocType; label: string; hint: string }[] = [
  { type: 'NRIC_FRONT', label: 'Main applicant NRIC — Front', hint: 'PDF or image of NRIC front side' },
  { type: 'NRIC_BACK',  label: 'Main applicant NRIC — Back',  hint: 'PDF or image of NRIC back side' },
  { type: 'NOA',        label: 'Notice of Assessment (NOA)', hint: 'Latest IRAS NOA — PDF' },
];

function DocSlotRow({
  type, label, hint, existing, busy, onFile,
}: {
  type: string;
  label: string;
  hint: string;
  existing: PlacementDocumentView | null;
  busy: boolean;
  onFile: (f: File) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink-900">{label}</div>
        <div className="text-xs text-ink-400 mt-0.5">
          {existing ? (
            existing.viewUrl
              ? <a href={existing.viewUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sage-700 hover:text-sage-900 font-medium">
                  {existing.originalName}
                </a>
              : <span className="text-ink-600">{existing.originalName}</span>
          ) : hint}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {existing && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
            Uploaded
          </span>
        )}
        <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
          busy ? 'opacity-40 pointer-events-none' : ''
        } ${existing
          ? 'border-cream-300 text-ink-500 hover:border-sage-400 hover:text-sage-700'
          : 'bg-sage-700 text-white border-sage-700 hover:bg-sage-800'
        }`}>
          {busy ? 'Uploading…' : existing ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept=".pdf,image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}

function memberSlot(i: number): { type: string; label: string; hint: string } {
  return {
    type: `MEMBER_IC_${i}`,
    label: `Household Member ${i} — IC / Passport`,
    hint: 'NRIC (front & back combined) or passport bio-data page',
  };
}

function JwcDocumentSection({
  placementId,
  status,
  memberDocCount: initialMemberDocCount,
  docs,
  employerDocsSubmittedAt,
  onDocUploaded,
  onSubmitted,
  onMemberCountChange,
}: {
  placementId: string;
  status: PlacementView['status'];
  memberDocCount: number;
  docs: PlacementDocumentView[];
  employerDocsSubmittedAt: string | null;
  onDocUploaded: (doc: PlacementDocumentView) => void;
  onSubmitted: (employerDocsSubmittedAt: string, status: string) => void;
  onMemberCountChange: (newCount: number) => void;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberDocCount, setMemberDocCountLocal] = useState(initialMemberDocCount);
  const [adjustingCount, setAdjustingCount] = useState(false);

  const submitted = employerDocsSubmittedAt !== null || status !== 'INITIATED';
  const waitingForHelper = submitted && status === 'INITIATED';
  const canAdjust = status === 'INITIATED' && !submitted;

  const allSlots = [
    ...BASE_DOC_SLOTS,
    ...Array.from({ length: memberDocCount }, (_, i) => memberSlot(i + 1)),
  ];
  const uploaded = new Map(docs.map((d) => [d.docType, d]));
  const allUploaded = allSlots.every(({ type }) => uploaded.has(type));

  async function handleFile(type: string, file: File) {
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10 MB.'); return; }
    setUploading(type);
    setError(null);
    try {
      const doc = await uploadPlacementDocument(placementId, type as PlacementDocType, file);
      onDocUploaded(doc);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  }

  async function handleCountChange(delta: number) {
    const next = Math.min(10, Math.max(1, memberDocCount + delta));
    if (next === memberDocCount) return;
    setAdjustingCount(true);
    try {
      await setMemberDocCount(placementId, next);
      setMemberDocCountLocal(next);
      onMemberCountChange(next);
    } finally {
      setAdjustingCount(false);
    }
  }

  async function handleSubmit() {
    if (!allUploaded || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitPlacementDocuments(placementId);
      onSubmitted(result.employerDocsSubmittedAt, result.status);
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Once submitted, show confirmation or waiting banner
  if (submitted) {
    return waitingForHelper ? (
      <div className="rounded-2xl bg-butter-50 border border-butter-200 px-5 py-4 flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">⏳</span>
        <p className="text-sm text-ink-800 leading-relaxed">
          Your documents have been submitted. Waiting for the helper to upload and submit
          their passport before the hiring moves to the next stage.
        </p>
      </div>
    ) : (
      <div className="rounded-2xl bg-sage-50 border border-sage-200 px-5 py-4 flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">✅</span>
        <p className="text-sm text-sage-900 leading-relaxed">
          All documents submitted. Our administrative team is now reviewing your application
          and will progress it to the{' '}
          <span className="font-semibold">MOM APPLICATION</span> stage once verified.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* JotForm */}
      <div className="rounded-2xl bg-sage-50 border border-sage-400/20 px-4 py-3 flex items-start gap-3">
        <span className="text-lg shrink-0">📋</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-sage-900">Step 1 — Complete the employer form</p>
          <p className="text-xs text-ink-600 mt-0.5 leading-relaxed">
            Fill in your household and employment details so our team can prepare your MOM application.
          </p>
          <a
            href={JOTFORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs font-semibold text-white bg-sage-700 hover:bg-sage-800 px-3 py-1.5 rounded-full transition-colors"
          >
            Open JotForm &rarr;
          </a>
        </div>
      </div>

      {/* Document uploads */}
      <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-cream-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Step 2 — Upload required documents</p>
              <p className="text-xs text-ink-500 mt-0.5">PDF or image, max 10 MB each.</p>
            </div>
          </div>
        </div>
        {error && (
          <div className="px-4 py-2 text-xs text-clay-600 bg-blush-50 border-b border-blush-100">{error}</div>
        )}
        <div className="divide-y divide-cream-100">
          {/* Base slots — main applicant NRIC + NOA */}
          {BASE_DOC_SLOTS.map(({ type, label, hint }) => (
            <DocSlotRow
              key={type}
              type={type}
              label={label}
              hint={hint}
              existing={uploaded.get(type) ?? null}
              busy={uploading === type}
              onFile={(f) => void handleFile(type, f)}
            />
          ))}

          {/* Household member IC/passport slots */}
          <div className="px-4 py-2.5 bg-cream-50 border-b border-cream-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-800">Household members IC / Passport</p>
              <p className="text-[11px] text-ink-500 mt-0.5">
                {memberDocCount} member{memberDocCount !== 1 ? 's' : ''} — include all people living in the household
              </p>
            </div>
            {canAdjust && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => void handleCountChange(-1)}
                  disabled={memberDocCount <= 1 || adjustingCount}
                  className="w-7 h-7 rounded-full border border-cream-300 text-ink-600 text-sm font-bold flex items-center justify-center hover:border-sage-400 disabled:opacity-30 transition-colors"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold text-ink-800 tabular-nums">
                  {memberDocCount}
                </span>
                <button
                  onClick={() => void handleCountChange(1)}
                  disabled={memberDocCount >= 10 || adjustingCount}
                  className="w-7 h-7 rounded-full border border-cream-300 text-ink-600 text-sm font-bold flex items-center justify-center hover:border-sage-400 disabled:opacity-30 transition-colors"
                >
                  +
                </button>
              </div>
            )}
          </div>
          {Array.from({ length: memberDocCount }, (_, i) => {
            const slot = memberSlot(i + 1);
            return (
              <DocSlotRow
                key={slot.type}
                type={slot.type}
                label={slot.label}
                hint={slot.hint}
                existing={uploaded.get(slot.type) ?? null}
                busy={uploading === slot.type}
                onFile={(f) => void handleFile(slot.type, f)}
              />
            );
          })}
        </div>

        {/* Submit button */}
        <div className="px-4 py-3 border-t border-cream-100 bg-cream-50">
          {!allUploaded && (
            <p className="text-xs text-ink-400 mb-2">
              Upload all documents ({allSlots.length - Object.keys(Object.fromEntries(uploaded)).length} remaining) to submit.
            </p>
          )}
          <button
            onClick={() => void handleSubmit()}
            disabled={!allUploaded || submitting}
            className="w-full py-3 rounded-xl bg-sage-900 text-cream-100 text-sm font-medium hover:bg-sage-800 disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit documents →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper passport section ───────────────────────────────────────────────────

const PASSPORT_SLOT = { type: 'PASSPORT' as PlacementDocType, label: 'Passport', hint: 'Bio-data page — PDF or image, max 10 MB' };

function HelperPassportSection({
  placementId,
  status,
  mode,
  docs,
  helperDocsSubmittedAt,
  onDocUploaded,
  onSubmitted,
}: {
  placementId: string;
  status: PlacementView['status'];
  mode: string;
  docs: PlacementDocumentView[];
  helperDocsSubmittedAt: string | null;
  onDocUploaded: (doc: PlacementDocumentView) => void;
  onSubmitted: (submittedAt: string, status: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existing = docs.find((d) => d.docType === 'PASSPORT');
  const locked = helperDocsSubmittedAt !== null || status !== 'INITIATED';
  const waitingForFamily = locked && status === 'INITIATED' && mode === 'JWC';

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10 MB.'); return; }
    setUploading(true);
    setError(null);
    try {
      const doc = await uploadPlacementDocument(placementId, 'PASSPORT', file);
      onDocUploaded(doc);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!existing || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitHelperDocuments(placementId);
      onSubmitted(result.helperDocsSubmittedAt, result.status);
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (locked) {
    return waitingForFamily ? (
      <div className="rounded-2xl bg-butter-50 border border-butter-200 px-5 py-4 flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">⏳</span>
        <p className="text-sm text-ink-800 leading-relaxed">
          Your passport has been submitted. Waiting for the family to submit their documents
          before the hiring moves to the next stage.
        </p>
      </div>
    ) : (
      <div className="rounded-2xl bg-sage-50 border border-sage-200 px-5 py-4 flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">✅</span>
        <p className="text-sm text-sage-900 leading-relaxed">
          Your passport has been submitted and is under review by our team.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-cream-100">
          <p className="text-sm font-medium text-ink-900">Upload your passport</p>
          <p className="text-xs text-ink-500 mt-0.5">Required for work permit processing. PDF or image, max 10 MB.</p>
        </div>
        {error && (
          <div className="px-4 py-2 text-xs text-clay-600 bg-blush-50 border-b border-blush-100">{error}</div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-900">{PASSPORT_SLOT.label}</div>
            <div className="text-xs text-ink-400 mt-0.5">
              {existing ? (
                existing.viewUrl
                  ? <a href={existing.viewUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sage-700 hover:text-sage-900 font-medium">
                      {existing.originalName}
                    </a>
                  : <span className="text-ink-600">{existing.originalName}</span>
              ) : PASSPORT_SLOT.hint}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {existing && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                Uploaded
              </span>
            )}
            <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              uploading ? 'opacity-40 pointer-events-none' : ''
            } ${existing
              ? 'border-cream-300 text-ink-500 hover:border-sage-400 hover:text-sage-700'
              : 'bg-sage-700 text-white border-sage-700 hover:bg-sage-800'
            }`}>
              {uploading ? 'Uploading…' : existing ? 'Replace' : 'Upload'}
              <input
                type="file"
                accept=".pdf,image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-cream-100 bg-cream-50">
          {!existing && (
            <p className="text-xs text-ink-400 mb-2">Upload your passport before submitting.</p>
          )}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!existing || submitting}
            className="w-full py-3 rounded-xl bg-sage-900 text-cream-100 text-sm font-medium hover:bg-sage-800 disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit passport for review →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Partner docs panel (metadata only, no download) ───────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  NRIC_FRONT: 'NRIC — Front',
  NRIC_BACK:  'NRIC — Back',
  NOA:        'Notice of Assessment',
  PASSPORT:   'Passport',
};

function docTypeLabel(type: string): string {
  if (DOC_TYPE_LABELS[type]) return DOC_TYPE_LABELS[type];
  const m = type.match(/^MEMBER_IC_(\d+)$/);
  if (m) return `Household Member ${m[1]} — IC / Passport`;
  return type;
}

function fmtBytes(n: number) {
  return n >= 1024 * 1024
    ? `${(n / (1024 * 1024)).toFixed(1)} MB`
    : `${(n / 1024).toFixed(0)} KB`;
}

function PartnerDocsPanel({
  docs,
  partnerLabel,
  docsLoaded,
}: {
  docs: PlacementDocumentView[];
  partnerLabel: string;
  docsLoaded: boolean;
}) {
  if (!docsLoaded) return null;

  return (
    <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-cream-100 flex items-center gap-2">
        <span className="text-base">📎</span>
        <p className="text-sm font-medium text-ink-900">{partnerLabel} documents</p>
        <span className="text-[10px] uppercase tracking-widest text-ink-400 ml-auto">view only</span>
      </div>
      {docs.length === 0 ? (
        <div className="px-4 py-3 text-xs text-ink-400 italic">No documents uploaded yet.</div>
      ) : (
        <div className="divide-y divide-cream-100">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-800">{docTypeLabel(d.docType)}</div>
                <div className="text-xs text-ink-400 mt-0.5">
                  {d.originalName} &middot; {fmtBytes(d.sizeBytes)} &middot;{' '}
                  {new Date(d.uploadedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cream-100 text-ink-500">
                Uploaded
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DIY steps ─────────────────────────────────────────────────────────────────

const DIY_STEPS = [
  "Collect helper's passport and latest IPA letter (if applicable)",
  'Purchase FDW insurance and $5,000 security bond',
  'Submit MOM work permit application at mom.gov.sg',
  'Attend Settling-In Programme (SIP) within 3 days of arrival',
  'Complete mandatory medical examination within 2 weeks',
  'Biometrics appointment at MOM Services Centre',
  'Collect work permit card when ready',
];
