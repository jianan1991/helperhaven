import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { asMessage } from '../../lib/api';
import {
  type EmployerProfile,
  type EmployerProfileRequest,
  type FiveVector,
  type HousingType,
  type SkillOption,
  ZERO_VECTOR,
  fetchEmployerProfile,
  fetchSkills,
  saveEmployerProfile,
  vectorSum,
} from '../../lib/profile';
import { WizardField, inputCls } from '../../components/onboarding/WizardShell';
import FiveVectorEditor from '../../components/onboarding/FiveVectorEditor';

const HOUSING_OPTIONS: { code: HousingType; label: string }[] = [
  { code: 'HDB',    label: 'HDB' },
  { code: 'CONDO',  label: 'Condo' },
  { code: 'LANDED', label: 'Landed' },
];

const SINGAPORE_DISTRICTS = [
  'Ang Mo Kio', 'Bedok', 'Bishan', 'Bukit Batok', 'Bukit Merah',
  'Bukit Panjang', 'Bukit Timah', 'Central', 'Choa Chu Kang', 'Clementi',
  'Downtown Core', 'Geylang', 'Hougang', 'Jurong East', 'Jurong West',
  'Kallang', 'Marine Parade', 'Novena', 'Outram', 'Pasir Ris',
  'Punggol', 'Queenstown', 'Sembawang', 'Sengkang', 'Serangoon',
  'Tampines', 'Tengah', 'Toa Payoh', 'Woodlands', 'Yishun',
];

const OFF_DAY_OPTIONS = [
  'One full Sunday per week',
  'Two Sundays per month',
  'One Sunday per month',
  'Alternate Sundays',
  'Any weekday (negotiable)',
  'No fixed day off',
];

const LANGUAGE_OPTIONS = [
  'English', 'Mandarin', 'Cantonese', 'Malay', 'Tamil', 'Hokkien', 'Any language',
];

const PURPOSE_TAGS = [
  'infant_care', 'toddler_care', 'elderly_care', 'cooking', 'housekeeping',
  'pet_care', 'school_runs',
];

interface FormState {
  fullName: string;
  householdSize: string;
  numChildren: string;
  numElderly: string;
  hasPets: boolean;
  housing: HousingType | '';
  district: string;
  salaryOfferSgdMin: string;
  salaryOfferSgdMax: string;
  offDayPolicy: string;
  preferredLanguages: string[];
  hiringPurpose: string;

  purposeTags: string[];
  weights: FiveVector;
}

const EMPTY: FormState = {
  fullName: '',
  householdSize: '',
  numChildren: '',
  numElderly: '',
  hasPets: false,
  housing: '',
  district: '',
  salaryOfferSgdMin: '',
  salaryOfferSgdMax: '',
  offDayPolicy: '',
  preferredLanguages: [],
  hiringPurpose: '',
  purposeTags: [],
  weights: ZERO_VECTOR,
};

function validate(form: FormState): string | null {
  if (!form.householdSize || Number(form.householdSize) <= 0)
    return 'Tell us how many people live in your household.';
  if (form.numChildren === '' || Number(form.numChildren) < 0)
    return 'Number of children must be 0 or more.';
  if (form.numElderly === '' || Number(form.numElderly) < 0)
    return 'Number of elderly must be 0 or more.';
  if (!form.housing) return 'Pick your housing type.';
  if (vectorSum(form.weights) !== 100)
    return 'Match weights must add up to exactly 100.';
  const hasMin = form.salaryOfferSgdMin !== '';
  const hasMax = form.salaryOfferSgdMax !== '';
  if (hasMin !== hasMax) return 'Set both salary bounds, or leave both blank.';
  if (hasMin && hasMax && Number(form.salaryOfferSgdMin) > Number(form.salaryOfferSgdMax))
    return "Min salary can't be higher than max salary.";
  return null;
}

export default function EmployerOnboarding() {
  const nav = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [skills, existing] = await Promise.all([fetchSkills(), fetchEmployerProfile()]);
        if (!cancelled) {
          setSkillOptions(skills);
          if (existing) setForm(toFormState(existing));
          setLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          setServerError(asMessage(err, 'Could not load your profile.'));
          setLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const skillLabels = useMemo<Record<keyof FiveVector, string>>(() => {
    const fallback: Record<keyof FiveVector, string> = {
      infant: 'Infant care', elderly: 'Elderly care',
      cooking: 'Cooking', house: 'Housekeeping', attitude: 'Attitude',
    };
    for (const s of skillOptions) fallback[s.key] = s.label;
    return fallback;
  }, [skillOptions]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTag(tag: string) {
    if (form.purposeTags.includes(tag)) {
      update('purposeTags', form.purposeTags.filter((t) => t !== tag));
    } else {
      update('purposeTags', [...form.purposeTags, tag]);
    }
  }

  async function handleSubmit() {
    const err = validate(form);
    if (err) {
      setServerError(err);
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      return;
    }
    setServerError(null);
    setSubmitting(true);
    try {
      const req: EmployerProfileRequest = {
        fullName: form.fullName.trim() || null,
        householdSize: Number(form.householdSize),
        numChildren: Number(form.numChildren),
        numElderly: Number(form.numElderly),
        hasPets: form.hasPets,
        housing: form.housing as HousingType,
        district: form.district.trim() || null,
        salaryOfferSgdMin: form.salaryOfferSgdMin ? Number(form.salaryOfferSgdMin) : null,
        salaryOfferSgdMax: form.salaryOfferSgdMax ? Number(form.salaryOfferSgdMax) : null,
        offDayPolicy: form.offDayPolicy || null,
        preferredLanguages: form.preferredLanguages,
        hiringPurpose: form.hiringPurpose.trim() || null,
        purposeTags: form.purposeTags,
        weights: form.weights,
      };
      await saveEmployerProfile(req);
      nav('/matches', { replace: true });
    } catch (err) {
      setServerError(asMessage(err, 'Could not save your profile. Try again.'));
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="max-w-xl mx-auto px-4 md:px-6 py-20 text-center text-ink-500">Loading…</div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
      <div>
        <h1 className="serif text-2xl md:text-3xl text-sage-900">Your profile</h1>
        <p className="text-sm text-ink-500 mt-1">Tell us about your household so we can find the right helper for you.</p>
      </div>

      {serverError && (
        <div ref={errorRef} className="rounded-2xl bg-clay-500/10 border border-clay-500/30 px-4 py-3 text-sm text-clay-700">
          {serverError}
        </div>
      )}

      {/* ── Household ── */}
      <Section title="Your household" hint="Basic details about who lives at home.">
        <WizardField label="Your name" hint="Optional — only shared after you unlock chat">
          <input
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            placeholder="e.g. Mr & Mrs Tan"
            className={inputCls()}
            autoFocus
          />
        </WizardField>

        <div className="grid grid-cols-3 gap-3">
          <WizardField label="Household size">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={form.householdSize}
              onChange={(e) => update('householdSize', e.target.value)}
              placeholder="4"
              className={inputCls()}
            />
          </WizardField>
          <WizardField label="Children">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.numChildren}
              onChange={(e) => update('numChildren', e.target.value)}
              placeholder="2"
              className={inputCls()}
            />
          </WizardField>
          <WizardField label="Elderly">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.numElderly}
              onChange={(e) => update('numElderly', e.target.value)}
              placeholder="1"
              className={inputCls()}
            />
          </WizardField>
        </div>

        <WizardField label="Housing type">
          <div className="grid grid-cols-3 gap-2">
            {HOUSING_OPTIONS.map((h) => (
              <button
                key={h.code}
                type="button"
                onClick={() => update('housing', h.code)}
                aria-pressed={form.housing === h.code}
                className={`rounded-2xl px-4 py-3 border transition-colors ${
                  form.housing === h.code
                    ? 'bg-sage-50 border-sage-400 ring-2 ring-sage-400/30 text-sage-900'
                    : 'bg-white border-cream-200 hover:border-sage-400/60 text-ink-900'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </WizardField>

        <WizardField label="District" hint="Optional">
          <select
            value={form.district}
            onChange={(e) => update('district', e.target.value)}
            className={inputCls()}
          >
            <option value="">Select district…</option>
            {SINGAPORE_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </WizardField>

        <label className="flex items-start gap-2.5 text-sm text-ink-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.hasPets}
            onChange={(e) => update('hasPets', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-cream-200 text-sage-500 focus:ring-sage-400/40 accent-sage-500"
          />
          <span>We have pets at home (helpers see this before matching).</span>
        </label>
      </Section>

      {/* ── Match priorities ── */}
      <Section title="Match priorities" hint="Distribute 100 points — heavier weight = stronger match preference.">
        <FiveVectorEditor
          value={form.weights}
          onChange={(v) => update('weights', v)}
          labels={skillLabels}
          helpText="Heavier weights pull matching toward helpers strong in that area. Set anything to 0 to ignore it."
        />
      </Section>

      {/* ── Hiring details ── */}
      <Section title="Hiring details" hint="Helpers see this — be specific so the right ones reach out.">
        <WizardField label="What are you hiring for?" hint="In your own words">
          <textarea
            value={form.hiringPurpose}
            onChange={(e) => update('hiringPurpose', e.target.value)}
            rows={3}
            placeholder="Looking for someone patient and warm to help look after our 6-month-old and prep simple meals."
            className={inputCls()}
          />
        </WizardField>

        <WizardField label="Tags" hint="Tap to add — helpers filter by these">
          <div className="flex flex-wrap gap-2">
            {PURPOSE_TAGS.map((tag) => {
              const active = form.purposeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
                    active
                      ? 'bg-sage-50 border-sage-400 text-sage-900'
                      : 'bg-white border-cream-200 text-ink-700 hover:border-sage-400/60'
                  }`}
                >
                  {tag.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        </WizardField>

        <div className="grid grid-cols-2 gap-3">
          <WizardField label="Salary offer min (SGD/mo)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.salaryOfferSgdMin}
              onChange={(e) => update('salaryOfferSgdMin', e.target.value)}
              placeholder="600"
              className={inputCls()}
            />
          </WizardField>
          <WizardField label="Salary offer max (SGD/mo)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.salaryOfferSgdMax}
              onChange={(e) => update('salaryOfferSgdMax', e.target.value)}
              placeholder="800"
              className={inputCls()}
            />
          </WizardField>
        </div>


        <WizardField label="Languages you speak at home" hint="Select all that apply — helpers see this">
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((l) => {
              const active = form.preferredLanguages.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() =>
                    update(
                      'preferredLanguages',
                      active
                        ? form.preferredLanguages.filter((x) => x !== l)
                        : [...form.preferredLanguages, l],
                    )
                  }
                  aria-pressed={active}
                  className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
                    active
                      ? 'bg-sage-50 border-sage-400 text-sage-900'
                      : 'bg-white border-cream-200 text-ink-700 hover:border-sage-400/60'
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </WizardField>

        <WizardField label="Off-day policy" hint="Optional">
          <select
            value={form.offDayPolicy}
            onChange={(e) => update('offDayPolicy', e.target.value)}
            className={inputCls()}
          >
            <option value="">Select policy…</option>
            {OFF_DAY_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </WizardField>
      </Section>

      {/* ── Save ── */}
      <div className="pt-2 pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 rounded-full bg-sage-900 text-cream-100 font-medium text-sm hover:bg-sage-800 disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Saving…' : 'Save & see my matches →'}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft space-y-4">
      <div>
        <h2 className="serif text-lg text-sage-900">{title}</h2>
        {hint && <p className="text-xs text-ink-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function toFormState(p: EmployerProfile): FormState {
  return {
    fullName: p.fullName ?? '',
    householdSize: String(p.householdSize ?? ''),
    numChildren: String(p.numChildren ?? ''),
    numElderly: String(p.numElderly ?? ''),
    hasPets: p.hasPets,
    housing: p.housing,
    district: p.district ?? '',
    salaryOfferSgdMin: p.salaryOfferSgdMin != null ? String(p.salaryOfferSgdMin) : '',
    salaryOfferSgdMax: p.salaryOfferSgdMax != null ? String(p.salaryOfferSgdMax) : '',
    offDayPolicy: p.offDayPolicy ?? '',
    preferredLanguages: p.preferredLanguages ?? [],
    hiringPurpose: p.hiringPurpose ?? '',
    purposeTags: p.purposeTags ?? [],
    weights: p.weights,
  };
}