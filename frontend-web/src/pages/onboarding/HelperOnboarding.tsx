import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { asMessage } from '../../lib/api';
import {
  type FiveVector,
  type HelperProfile,
  type HelperProfileRequest,
  type LanguageOption,
  type LanguageProficiency,
  type Nationality,
  type SkillOption,
  type WorkEntry,
  ZERO_VECTOR,
  fetchHelperProfile,
  fetchLanguages,
  fetchSkills,
  saveHelperProfile,
  uploadProfilePhoto,
  vectorSum,
} from '../../lib/profile';
import { inputCls, WizardField } from '../../components/onboarding/WizardShell';
import FiveVectorEditor from '../../components/onboarding/FiveVectorEditor';

const NATIONALITIES: { code: Nationality; label: string }[] = [
  { code: 'PHL',   label: 'Philippines' },
  { code: 'IDN',   label: 'Indonesia' },
  { code: 'MMR',   label: 'Myanmar' },
  { code: 'OTHER', label: 'Other' },
];

const PROFICIENCY_LEVELS = [
  { value: 25,  label: 'Basic' },
  { value: 50,  label: 'Conversational' },
  { value: 75,  label: 'Fluent' },
  { value: 100, label: 'Native' },
];

const COUNTRY_OPTIONS = [
  { code: 'SG', label: 'Singapore',    flag: '🇸🇬' },
  { code: 'PH', label: 'Philippines',  flag: '🇵🇭' },
  { code: 'ID', label: 'Indonesia',    flag: '🇮🇩' },
  { code: 'MM', label: 'Myanmar',      flag: '🇲🇲' },
  { code: 'HK', label: 'Hong Kong',    flag: '🇭🇰' },
  { code: 'TW', label: 'Taiwan',       flag: '🇹🇼' },
  { code: 'MY', label: 'Malaysia',     flag: '🇲🇾' },
  { code: 'OTHER', label: 'Other',     flag: '🌏' },
];

const DUTY_OPTIONS = [
  { key: 'infant_care',   label: '👶 Infant care' },
  { key: 'child_care',    label: '👧 Child care' },
  { key: 'elderly_care',  label: '🧓 Elderly care' },
  { key: 'dementia',      label: '🧠 Dementia care' },
  { key: 'cooking',       label: '🍳 Cooking' },
  { key: 'housekeeping',  label: '🧹 Housekeeping' },
  { key: 'school_runs',   label: '🚸 School runs' },
  { key: 'medication',    label: '💊 Medication' },
  { key: 'driving',       label: '🚗 Driving' },
  { key: 'pet_care',      label: '🐾 Pet care' },
  { key: 'grocery',       label: '🛒 Grocery shopping' },
];


const EMPTY_ENTRY: Omit<WorkEntry, 'id'> = {
  country: 'SG',
  location: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
  duties: [],
  leftBecause: '',
};

function fmtYearMonth(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function durationLabel(start: string, end: string, isCurrent: boolean): string {
  if (!start) return '';
  const from = new Date(`${start}-01`);
  const to = isCurrent ? new Date() : (end ? new Date(`${end}-01`) : null);
  if (!to) return '';
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (months < 1) return 'Less than a month';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y > 0 && `${y} year${y > 1 ? 's' : ''}`, m > 0 && `${m} month${m > 1 ? 's' : ''}`]
    .filter(Boolean).join(' ');
}

interface FormState {
  displayFirstName: string;
  fullName: string;
  nationality: Nationality | '';
  dateOfBirth: string;
  yearsExperience: string;
  bio: string;
  workHistory: WorkEntry[];
  dietaryPrefs: string[];
  foodRestrictions: string[];
  expectedSalarySgd: string;
  availableFrom: string;
  currentLocation: string;
  offDayPolicy: string;
  photoKey: string | null;
  photoPreviewUrl: string | null;
  languages: LanguageProficiency[];
  skills: FiveVector;
}

const EMPTY: FormState = {
  displayFirstName: '',
  fullName: '',
  nationality: '',
  dateOfBirth: '',
  yearsExperience: '',
  bio: '',
  workHistory: [],
  dietaryPrefs: [],
  foodRestrictions: [],
  expectedSalarySgd: '',
  availableFrom: '',
  currentLocation: '',
  offDayPolicy: '',
  photoKey: null,
  photoPreviewUrl: null,
  languages: [],
  skills: ZERO_VECTOR,
};

function validate(form: FormState): string | null {
  if (!form.displayFirstName.trim()) return 'Tell us what to call you on your card.';
  if (!form.nationality) return 'Pick your nationality.';
  if (!form.dateOfBirth) return 'Add your date of birth.';
  if (!form.yearsExperience || isNaN(Number(form.yearsExperience)))
    return 'Years of experience must be a number (use 0 if this is your first time).';
  if (Number(form.yearsExperience) < 0) return "Experience can't be negative.";
  if (form.languages.length === 0)
    return 'Choose at least one language so families can communicate with you.';
  if (vectorSum(form.skills) !== 100)
    return 'Your skill points must add up to exactly 100.';
  return null;
}

export default function HelperOnboarding() {
  const nav = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<'profile' | 'story'>('profile');
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [langs, skills, existing] = await Promise.all([
          fetchLanguages(),
          fetchSkills(),
          fetchHelperProfile(),
        ]);
        if (cancelled) return;
        setLanguages(langs);
        setSkillOptions(skills);
        if (existing) setForm(toFormState(existing));
      } catch (err) {
        if (!cancelled) setServerError(asMessage(err, 'Could not load your profile.'));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const skillLabels = useMemo<Record<keyof FiveVector, string>>(() => {
    const fallback: Record<keyof FiveVector, string> = {
      infant: 'Infant care',
      elderly: 'Elderly care',
      cooking: 'Cooking',
      house: 'Housekeeping',
      attitude: 'Attitude',
    };
    for (const s of skillOptions) fallback[s.key] = s.label;
    return fallback;
  }, [skillOptions]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleLang(id: number) {
    const has = form.languages.find((l) => l.languageId === id);
    if (has) {
      update('languages', form.languages.filter((l) => l.languageId !== id));
    } else {
      update('languages', [...form.languages, { languageId: id, proficiency: 50 }]);
    }
  }

  function setProficiency(id: number, prof: number) {
    update(
      'languages',
      form.languages.map((l) => (l.languageId === id ? { ...l, proficiency: prof } : l)),
    );
  }

  async function onPhotoChange(file: File) {
    setUploadingPhoto(true);
    setServerError(null);
    try {
      const key = await uploadProfilePhoto(file);
      const previewUrl = URL.createObjectURL(file);
      setForm((prev) => ({ ...prev, photoKey: key, photoPreviewUrl: previewUrl }));
    } catch (err) {
      setServerError(asMessage(err, 'Photo upload failed. Try a smaller image.'));
    } finally {
      setUploadingPhoto(false);
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
      const req: HelperProfileRequest = {
        displayFirstName: form.displayFirstName.trim(),
        fullName: form.fullName.trim() || null,
        nationality: form.nationality as Nationality,
        dateOfBirth: form.dateOfBirth,
        yearsExperience: Number(form.yearsExperience),
        religion: null,
        maritalStatus: null,
        education: null,
        bio: form.bio.trim() || null,
        heightCm: null,
        weightKg: null,
        willingLiveIn: true,
        comfortableWithChildren: true,
        comfortableWithPets: true,
        halal: form.dietaryPrefs.includes('halal'),
        allergies: form.foodRestrictions.length > 0 ? form.foodRestrictions.join(', ') : null,
        expectedSalarySgd: form.expectedSalarySgd ? Number(form.expectedSalarySgd) : null,
        availableFrom: form.availableFrom || null,
        currentLocation: form.currentLocation.trim() || null,
        offDayPolicy: form.offDayPolicy.trim() || null,
        photoUrl: form.photoKey,
        skills: form.skills,
        languages: form.languages,
        workHistory: form.workHistory,
      };
      await saveHelperProfile(req);
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
        <p className="text-sm text-ink-500 mt-1">Fill in your details so families can find and connect with you.</p>
      </div>

      {serverError && (
        <div ref={errorRef} className="rounded-2xl bg-clay-500/10 border border-clay-500/30 px-4 py-3 text-sm text-clay-700">
          {serverError}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex rounded-full border border-cream-200 bg-white p-1 gap-1">
        {(['profile', 'story'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-sage-900 text-cream-100'
                : 'text-ink-600 hover:bg-cream-100'
            }`}
          >
            {t === 'profile' ? 'Profile' : 'My Story'}
          </button>
        ))}
      </div>

      {tab === 'profile' && <>
      {/* ── Profile ── */}
      <Section title="Profile">
        <WizardField label="Display first name" hint="What employers see on your card">
          <input
            value={form.displayFirstName}
            onChange={(e) => update('displayFirstName', e.target.value)}
            placeholder="e.g. Maria"
            className={inputCls()}
            autoFocus
          />
        </WizardField>
        <WizardField label="Full legal name" hint="Optional — visible after meeting">
          <input
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            placeholder="e.g. Maria Santos Cruz"
            className={inputCls()}
          />
        </WizardField>

        <WizardField label="Profile photo" hint="JPEG / PNG / WebP — under 5 MB">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-cream-200 border border-cream-200 flex-shrink-0 flex items-center justify-center">
              {form.photoPreviewUrl ? (
                <img src={form.photoPreviewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-ink-500 text-xs">No photo</span>
              )}
            </div>
            <label className="cursor-pointer px-4 py-2.5 rounded-full text-sm border border-sage-400/40 text-sage-700 hover:bg-sage-50">
              {uploadingPhoto ? 'Uploading…' : form.photoKey ? 'Replace photo' : 'Choose a photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPhotoChange(f);
                }}
              />
            </label>
          </div>
        </WizardField>

        <WizardField label="Short bio" hint="Optional — 1-2 sentences">
          <textarea
            value={form.bio}
            onChange={(e) => update('bio', e.target.value)}
            rows={3}
            placeholder="I love working with toddlers and have been cooking Filipino food for families for 6 years."
            className={inputCls()}
          />
        </WizardField>

        <div className="grid grid-cols-2 gap-3">
          <WizardField label="Expected salary (SGD/mo)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.expectedSalarySgd}
              onChange={(e) => update('expectedSalarySgd', e.target.value)}
              placeholder="650"
              className={inputCls()}
            />
          </WizardField>
          <WizardField label="Available from">
            <input
              type="date"
              value={form.availableFrom}
              onChange={(e) => update('availableFrom', e.target.value)}
              className={inputCls()}
            />
          </WizardField>
        </div>

        <WizardField label="Currently based in" hint="Families need this to plan your work pass">
          <select
            value={form.currentLocation}
            onChange={(e) => update('currentLocation', e.target.value)}
            className={inputCls()}
          >
            <option value="">Select country…</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.label}>{c.flag} {c.label}</option>
            ))}
          </select>
        </WizardField>

        <WizardField label="Off-day preference" hint="Optional">
          <select
            value={form.offDayPolicy}
            onChange={(e) => update('offDayPolicy', e.target.value)}
            className={inputCls()}
          >
            <option value="">Select preference…</option>
            <option>One full Sunday per week</option>
            <option>Two Sundays per month</option>
            <option>One Sunday per month</option>
            <option>Alternate Sundays</option>
            <option>Any weekday (negotiable)</option>
            <option>No fixed day off</option>
          </select>
        </WizardField>

        <div className="border-t border-cream-200 pt-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-ink-900 mb-0.5">Languages you speak</p>
            <p className="text-xs text-ink-500">Tap to add, then set your comfort level.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => {
              const active = form.languages.some((l) => l.languageId === lang.id);
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => toggleLang(lang.id)}
                  aria-pressed={active}
                  className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
                    active
                      ? 'bg-sage-50 border-sage-400 text-sage-900'
                      : 'bg-white border-cream-200 text-ink-700 hover:border-sage-400/60'
                  }`}
                >
                  {lang.displayName}
                </button>
              );
            })}
          </div>
          {form.languages.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-500 uppercase tracking-wide">Comfort level</p>
              {form.languages.map((l) => {
                const lang = languages.find((x) => x.id === l.languageId);
                if (!lang) return null;
                return (
                  <div key={l.languageId} className="rounded-xl border border-cream-200 bg-white p-3">
                    <div className="text-sm font-medium text-ink-900 mb-2">{lang.displayName}</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {PROFICIENCY_LEVELS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setProficiency(l.languageId, p.value)}
                          className={`px-3 py-1.5 rounded-full text-xs border ${
                            l.proficiency === p.value
                              ? 'bg-sage-500 text-white border-sage-500'
                              : 'bg-white text-ink-700 border-cream-200 hover:border-sage-400/60'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {/* ── Background ── */}
      <Section title="Background">
        <WizardField label="Nationality">
          <div className="grid grid-cols-2 gap-2">
            {NATIONALITIES.map((n) => (
              <button
                key={n.code}
                type="button"
                onClick={() => update('nationality', n.code)}
                aria-pressed={form.nationality === n.code}
                className={`text-left rounded-2xl px-4 py-3 border transition-colors ${
                  form.nationality === n.code
                    ? 'bg-sage-50 border-sage-400 ring-2 ring-sage-400/30 text-sage-900'
                    : 'bg-white border-cream-200 hover:border-sage-400/60 text-ink-900'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </WizardField>
        <WizardField label="Date of birth">
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => update('dateOfBirth', e.target.value)}
            className={inputCls()}
          />
        </WizardField>
        <WizardField label="Years of experience" hint="0 if this is your first time">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={form.yearsExperience}
            onChange={(e) => update('yearsExperience', e.target.value)}
            placeholder="0"
            className={inputCls()}
          />
        </WizardField>
      </Section>

      {/* ── Skills ── */}
      <Section title="Your strengths" hint="Distribute 100 points across these five areas.">
        <FiveVectorEditor
          value={form.skills}
          onChange={(v) => update('skills', v)}
          labels={skillLabels}
          helpText="No wrong answers — be honest. Families weight these dimensions on their side, so a precise self-rating leads to better matches."
        />
      </Section>

      {/* ── Dietary & Food ── */}
      <Section title="Dietary & food">
        <WizardField label="Dietary preferences" hint="Select all that apply">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'halal',       label: 'Halal' },
                { key: 'vegetarian',  label: 'Vegetarian' },
                { key: 'no_pork',     label: 'No pork' },
                { key: 'no_beef',     label: 'No beef' },
                { key: 'no_seafood',  label: 'No seafood' },
              ] as const
            ).map(({ key, label }) => {
              const active = form.dietaryPrefs.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    update(
                      'dietaryPrefs',
                      active
                        ? form.dietaryPrefs.filter((k) => k !== key)
                        : [...form.dietaryPrefs, key],
                    )
                  }
                  aria-pressed={active}
                  className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
                    active
                      ? 'bg-sage-50 border-sage-400 text-sage-900'
                      : 'bg-white border-cream-200 text-ink-700 hover:border-sage-400/60'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ink-500 mt-1.5">Leave blank if you have no dietary requirements.</p>
        </WizardField>

        <WizardField label="Food handling restrictions" hint="What you are not able to prepare">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "Won't cook pork",    label: "Won't cook pork" },
                { key: "Won't handle alcohol", label: "Won't handle alcohol" },
                { key: "Won't cook beef",    label: "Won't cook beef" },
                { key: "Won't cook seafood", label: "Won't cook seafood" },
              ] as const
            ).map(({ key, label }) => {
              const active = form.foodRestrictions.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    update(
                      'foodRestrictions',
                      active
                        ? form.foodRestrictions.filter((k) => k !== key)
                        : [...form.foodRestrictions, key],
                    )
                  }
                  aria-pressed={active}
                  className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
                    active
                      ? 'bg-sage-50 border-sage-400 text-sage-900'
                      : 'bg-white border-cream-200 text-ink-700 hover:border-sage-400/60'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ink-500 mt-1.5">Leave blank if there are no restrictions.</p>
        </WizardField>
      </Section>

      {/* ── Save ── */}
      <div className="pt-2 pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || uploadingPhoto}
          className="w-full py-3.5 rounded-full bg-sage-900 text-cream-100 font-medium text-sm hover:bg-sage-800 disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Saving…' : 'Save & meet families →'}
        </button>
      </div>
      </>}

      {/* ── My Story tab ── */}
      {tab === 'story' && <>
        <StorySection
          entries={form.workHistory}
          onChange={(entries) => update('workHistory', entries)}
        />
        <div className="pt-2 pb-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-sage-900 text-cream-100 font-medium text-sm hover:bg-sage-800 disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Saving…' : 'Save & meet families →'}
          </button>
        </div>
      </>}
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

// ── Your story ────────────────────────────────────────────────────────────────

function StorySection({
  entries,
  onChange,
}: {
  entries: WorkEntry[];
  onChange: (entries: WorkEntry[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null); // null = none, 'new' = adding
  const [draft, setDraft] = useState<Omit<WorkEntry, 'id'>>(EMPTY_ENTRY);

  function openNew() {
    setDraft(EMPTY_ENTRY);
    setEditingId('new');
  }

  function openEdit(entry: WorkEntry) {
    setDraft({ ...entry });
    setEditingId(entry.id);
  }

  function cancel() {
    setEditingId(null);
    setDraft(EMPTY_ENTRY);
  }

  function save() {
    if (!draft.location.trim() || !draft.startDate) return;
    if (editingId === 'new') {
      onChange([{ ...draft, id: crypto.randomUUID() }, ...entries]);
    } else {
      onChange(entries.map((e) => (e.id === editingId ? { ...draft, id: e.id } : e)));
    }
    cancel();
  }

  function remove(id: string) {
    onChange(entries.filter((e) => e.id !== id));
  }

  function updateDraft<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const countryMeta = (code: string) =>
    COUNTRY_OPTIONS.find((c) => c.code === code) ?? COUNTRY_OPTIONS[COUNTRY_OPTIONS.length - 1];

  return (
    <div className="rounded-3xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="serif text-lg text-sage-900">Your story</h2>
          <p className="text-xs text-ink-500 mt-0.5">Add the households you've worked in — families read this to picture what it's like to hire you.</p>
        </div>
        {editingId === null && (
          <button
            type="button"
            onClick={openNew}
            className="shrink-0 px-4 py-2 rounded-full text-sm border border-sage-400/40 text-sage-700 hover:bg-sage-50 transition-colors"
          >
            + Add household
          </button>
        )}
      </div>

      {/* Self-reported notice */}
      <div className="rounded-2xl bg-cream-50 border border-cream-200 px-4 py-3 flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-cream-200 flex items-center justify-center text-sage-700 shrink-0 text-xs">ⓘ</div>
        <p className="text-xs text-ink-700">
          <strong className="text-ink-900">Self-reported.</strong> These entries are in your own words, like a CV. Reviews from employers you work with through HelperHaven will appear separately with a verified mark.
        </p>
      </div>

      {/* Add / Edit form */}
      {editingId !== null && (
        <div className="rounded-2xl border border-sage-400/30 bg-sage-50/40 p-4 space-y-4">
          <p className="text-sm font-medium text-ink-900">
            {editingId === 'new' ? 'Add a household' : 'Edit entry'}
          </p>

          {/* Country + Location */}
          <div className="grid grid-cols-[auto_1fr] gap-2 items-end">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Country</label>
              <select
                value={draft.country}
                onChange={(e) => updateDraft('country', e.target.value)}
                className={`${inputCls()} pr-8 py-2.5`}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Area / district</label>
              <input
                value={draft.location}
                onChange={(e) => updateDraft('location', e.target.value)}
                placeholder="e.g. Bukit Timah"
                className={inputCls()}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">From</label>
              <input
                type="month"
                value={draft.startDate}
                onChange={(e) => updateDraft('startDate', e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                To {draft.isCurrent && <span className="text-sage-600">(current)</span>}
              </label>
              <input
                type="month"
                value={draft.endDate}
                onChange={(e) => updateDraft('endDate', e.target.value)}
                disabled={draft.isCurrent}
                className={`${inputCls()} disabled:opacity-50`}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={draft.isCurrent}
              onChange={(e) => updateDraft('isCurrent', e.target.checked)}
              className="accent-sage-500"
            />
            <span className="text-sm text-ink-700">This is my current position</span>
          </label>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">What did you do?</label>
            <textarea
              value={draft.description}
              onChange={(e) => updateDraft('description', e.target.value)}
              rows={3}
              placeholder="Describe the household and your main responsibilities…"
              className={inputCls()}
            />
          </div>

          {/* Duties */}
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-2">Main duties</label>
            <div className="flex flex-wrap gap-2">
              {DUTY_OPTIONS.map(({ key, label }) => {
                const active = draft.duties.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      updateDraft(
                        'duties',
                        active ? draft.duties.filter((d) => d !== key) : [...draft.duties, key],
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      active
                        ? 'bg-sage-50 border-sage-400 text-sage-900'
                        : 'bg-white border-cream-200 text-ink-700 hover:border-sage-400/60'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left because */}
          {!draft.isCurrent && (
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Why did you leave? <span className="text-ink-400 font-normal">(optional)</span></label>
              <input
                value={draft.leftBecause}
                onChange={(e) => updateDraft('leftBecause', e.target.value)}
                placeholder="e.g. Contract ended, family relocated…"
                className={inputCls()}
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={!draft.location.trim() || !draft.startDate}
              className="px-5 py-2.5 rounded-full bg-sage-900 text-cream-100 text-sm font-medium hover:bg-sage-800 disabled:opacity-50 transition-colors"
            >
              Save entry
            </button>
            <button
              type="button"
              onClick={cancel}
              className="px-5 py-2.5 rounded-full text-sm text-ink-600 hover:bg-cream-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {entries.length > 0 && (
        <div className="relative pl-7 border-l-2 border-cream-200 space-y-4">
          {entries.map((entry) => {
            const meta = countryMeta(entry.country);
            const dateLabel = `${fmtYearMonth(entry.startDate)} – ${entry.isCurrent ? 'present' : fmtYearMonth(entry.endDate)}`;
            const dur = durationLabel(entry.startDate, entry.endDate, entry.isCurrent);
            return (
              <div key={entry.id} className="relative">
                <div className={`absolute -left-[37px] top-4 w-4 h-4 rounded-full ring-4 ring-white ${
                  entry.isCurrent ? 'bg-sage-500' : 'bg-sage-300'
                }`} />
                <div className="rounded-2xl bg-white border border-cream-200 p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{meta.flag}</span>
                        <span className="serif text-base font-bold text-ink-900">
                          {meta.label}{entry.location ? ` · ${entry.location}` : ''}
                        </span>
                        {entry.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-[10px] font-semibold uppercase tracking-widest">Current</span>
                        )}
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">
                        {dateLabel}{dur && ` · ${dur}`}
                      </div>
                    </div>
                    {editingId === null && (
                      <div className="flex gap-3 shrink-0">
                        <button type="button" onClick={() => openEdit(entry)} className="text-xs text-ink-400 hover:text-sage-700 underline">Edit</button>
                        <button type="button" onClick={() => remove(entry.id)} className="text-xs text-ink-400 hover:text-clay-500 underline">Delete</button>
                      </div>
                    )}
                  </div>

                  {entry.description && (
                    <p className="text-sm text-ink-700 mb-3">{entry.description}</p>
                  )}

                  {entry.duties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {entry.duties.map((d) => {
                        const opt = DUTY_OPTIONS.find((o) => o.key === d);
                        return opt ? (
                          <span key={d} className="px-2.5 py-1 rounded-full bg-cream-100 text-ink-700 text-xs">{opt.label}</span>
                        ) : null;
                      })}
                    </div>
                  )}

                  {!entry.isCurrent && entry.leftBecause && (
                    <div className="text-xs text-ink-500 pt-2 border-t border-cream-200">
                      <strong className="text-ink-700">Left because:</strong> {entry.leftBecause}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {/* Timeline end marker */}
          <div className="relative">
            <div className="absolute -left-[37px] top-1 w-4 h-4 rounded-full bg-cream-200 ring-4 ring-white" />
            <p className="text-xs text-ink-500 italic pt-0.5">Beginning of known history</p>
          </div>
        </div>
      )}

      {entries.length === 0 && editingId === null && (
        <p className="text-sm text-ink-400 italic">No entries yet — add your first household above.</p>
      )}
    </div>
  );
}

function toFormState(p: HelperProfile): FormState {
  return {
    displayFirstName: p.displayFirstName ?? '',
    fullName: p.fullName ?? '',
    nationality: p.nationality,
    dateOfBirth: p.dateOfBirth ?? '',
    yearsExperience: String(p.yearsExperience ?? 0),
    bio: p.bio ?? '',
    workHistory: p.workHistory ?? [],
    dietaryPrefs: p.halal ? ['halal'] : [],
    foodRestrictions: p.allergies
      ? p.allergies.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    expectedSalarySgd: p.expectedSalarySgd != null ? String(p.expectedSalarySgd) : '',
    availableFrom: p.availableFrom ?? '',
    currentLocation: p.currentLocation ?? '',
    offDayPolicy: p.offDayPolicy ?? '',
    photoKey: null,
    photoPreviewUrl: p.photoUrl,
    languages: p.languages,
    skills: p.skills,
  };
}