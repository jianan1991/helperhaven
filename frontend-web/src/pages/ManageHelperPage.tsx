import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../lib/auth';
import {
  createPlacement,
  listPlacements,
  fetchPlacementDocuments,
  uploadPlacementDocument,
  submitPlacementDocuments,
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
          {isEmployer ? 'Employer' : 'Helper'} &middot; placements
        </div>
        <h1 className="serif text-4xl font-bold text-ink-900 mt-2">{isEmployer ? 'Manage Helper' : 'Manage Employment'}</h1>
        <p className="mt-2 text-ink-500 text-sm max-w-xl">
          {isEmployer
            ? "Track the progress of every helper you've hired or are in the process of hiring."
            : 'See your active and upcoming placements.'}
        </p>
      </div>

      {items === null ? (
        <div className="text-center text-ink-500 py-20">Loading&hellip;</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-cream-200 bg-white p-10 text-center shadow-soft">
          <p className="text-ink-700 mb-2">No placements yet.</p>
          <p className="text-sm text-ink-500 mb-6">
            {isEmployer
              ? 'Once you accept an offer and initiate the placement, it will appear here.'
              : 'Once an employer initiates the placement, it will appear here.'}
          </p>
          <Link to="/matches" className="text-sm text-sage-700 hover:text-sage-900 font-medium">
            Browse matches &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((p) => (
            <PlacementCard
              key={p.id}
              placement={p}
              isEmployer={isEmployer}
              onStatusChange={(id, status) =>
                setItems((prev) => prev?.map((x) => x.id === id ? { ...x, status } : x) ?? null)
              }
            />
          ))}
        </div>
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
        <div className="text-xs uppercase tracking-widest text-sage-700">Placement &middot; next steps</div>
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
                <li>Replacement guarantee: free re-placement within 3 months if helper resigns in month 1</li>
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
        {submitting ? 'Setting up…' : 'Confirm & start placement →'}
      </button>
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
  const stepIndex = PLACEMENT_STEPS.findIndex((s) => s.key === p.status);
  const mode = p.engagementMode;
  const total = p.selectedServices.reduce((sum, s) => sum + s.priceSgd, 0);

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

      {/* Progress stepper */}
      <div className="flex items-center">
        {PLACEMENT_STEPS.map((step, i) => {
          const done = i <= stepIndex;
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

      {/* Selected services summary (JWC only) */}
      {mode === 'JWC' && p.selectedServices.length > 0 && (
        <div className="rounded-2xl bg-cream-50 border border-cream-200 divide-y divide-cream-100 overflow-hidden">
          {p.selectedServices.map((svc) => (
            <div key={svc.id} className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="text-base">{svc.icon}</span>
              <span className="flex-1 text-xs text-ink-700">{svc.title}</span>
              <span className="text-xs font-medium text-ink-500 tabular-nums">
                SGD {svc.priceSgd.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5 bg-sage-50">
            <span className="text-xs font-semibold text-ink-700">Total</span>
            <span className="text-sm font-bold text-sage-900 tabular-nums">SGD {total.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Mode-specific guidance */}
      {mode === 'JWC' && isEmployer ? (
        <JwcDocumentSection
          placementId={p.id}
          status={p.status}
          onSubmitted={() => onStatusChange(p.id, 'DOCS_COLLECTION')}
        />
      ) : mode === 'JWC' ? (
        <div className="rounded-2xl bg-sage-50 border border-sage-400/20 px-4 py-3 flex items-start gap-3">
          <span className="text-lg shrink-0">{'🤝'}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-sage-900 mb-0.5">JWC Employment Services</p>
            <p className="text-xs text-ink-600 leading-relaxed">
              The family is using JWC Employment Services to handle the work permit.
            </p>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function PersonAvatar({ src, name }: { src: string | null; name: string }) {
  const initials = name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  if (src) {
    return <img src={src} alt="" className="w-14 h-14 rounded-2xl object-cover bg-cream-200 shrink-0" />;
  }
  return (
    <div className="w-14 h-14 rounded-2xl bg-sage-50 text-sage-900 flex items-center justify-center font-semibold text-lg shrink-0">
      {initials || '·'}
    </div>
  );
}

// Update this URL to the actual JotForm employer intake form link
const JOTFORM_URL = 'https://form.jotform.com/helperhaven/employer-intake';

const DOC_SLOTS: { type: PlacementDocType; label: string; hint: string }[] = [
  { type: 'NRIC_FRONT', label: 'NRIC — Front', hint: 'PDF or image of NRIC front side' },
  { type: 'NRIC_BACK',  label: 'NRIC — Back',  hint: 'PDF or image of NRIC back side' },
  { type: 'NOA',        label: 'Notice of Assessment (NOA)', hint: 'Latest IRAS NOA — PDF' },
];

function JwcDocumentSection({
  placementId,
  status,
  onSubmitted,
}: {
  placementId: string;
  status: PlacementView['status'];
  onSubmitted: () => void;
}) {
  const [docs, setDocs] = useState<PlacementDocumentView[] | null>(null);
  const [uploading, setUploading] = useState<PlacementDocType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitted = status !== 'INITIATED';

  useEffect(() => {
    fetchPlacementDocuments(placementId).then(setDocs).catch(() => setDocs([]));
  }, [placementId]);

  const uploaded = new Map(docs?.map((d) => [d.docType, d]));
  const allUploaded = DOC_SLOTS.every(({ type }) => uploaded.has(type));

  async function handleFile(type: PlacementDocType, file: File) {
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10 MB.'); return; }
    setUploading(type);
    setError(null);
    try {
      const doc = await uploadPlacementDocument(placementId, type, file);
      setDocs((prev) => {
        const next = (prev ?? []).filter((d) => d.docType !== type);
        return [...next, doc];
      });
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit() {
    if (!allUploaded || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitPlacementDocuments(placementId);
      onSubmitted();
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Once submitted, show confirmation banner instead of the upload form
  if (submitted) {
    return (
      <div className="rounded-2xl bg-sage-50 border border-sage-200 px-5 py-4 flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">✅</span>
        <p className="text-sm text-sage-900 leading-relaxed">
          Our administrative team is currently reviewing your submitted documentation. Once verified,
          your application will automatically progress to the{' '}
          <span className="font-semibold">MOM APPLICATION</span>.
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
          <p className="text-sm font-medium text-ink-900">Step 2 — Upload required documents</p>
          <p className="text-xs text-ink-500 mt-0.5">PDF or image, max 10 MB each.</p>
        </div>
        {error && (
          <div className="px-4 py-2 text-xs text-clay-600 bg-blush-50 border-b border-blush-100">{error}</div>
        )}
        <div className="divide-y divide-cream-100">
          {DOC_SLOTS.map(({ type, label, hint }) => {
            const existing = uploaded.get(type);
            const busy = uploading === type;
            return (
              <div key={type} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-900">{label}</div>
                  <div className="text-xs text-ink-400 mt-0.5">
                    {existing ? (
                      <a href={existing.viewUrl} target="_blank" rel="noopener noreferrer"
                        className="text-sage-700 hover:text-sage-900 font-medium">
                        {existing.originalName}
                      </a>
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
                        if (f) void handleFile(type, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit button */}
        <div className="px-4 py-3 border-t border-cream-100 bg-cream-50">
          {!allUploaded && (
            <p className="text-xs text-ink-400 mb-2">Upload all three documents to submit.</p>
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

const DIY_STEPS = [
  "Collect helper's passport and latest IPA letter (if applicable)",
  'Purchase FDW insurance and $5,000 security bond',
  'Submit MOM work permit application at mom.gov.sg',
  'Attend Settling-In Programme (SIP) within 3 days of arrival',
  'Complete mandatory medical examination within 2 weeks',
  'Biometrics appointment at MOM Services Centre',
  'Collect work permit card when ready',
];
