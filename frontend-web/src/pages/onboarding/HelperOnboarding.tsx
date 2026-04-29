import { useEffect, useMemo, useState } from 'react';
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
  ZERO_VECTOR,
  fetchHelperProfile,
  fetchLanguages,
  fetchSkills,
  saveHelperProfile,
  uploadProfilePhoto,
  vectorSum,
} from '../../lib/profile';
import WizardShell, {
  PrimaryButton,
  SecondaryButton,
  WizardField,
  inputCls,
} from '../../components/onboarding/WizardShell';
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

interface FormState {
  displayFirstName: string;
  fullName: string;
  nationality: Nationality | '';
  dateOfBirth: string;
  yearsExperience: string; // free-text -> int on submit
  bio: string;
  willingLiveIn: boolean;
  comfortableWithChildren: boolean;
  comfortableWithPets: boolean;
  halal: boolean;
  allergies: string;
  expectedSalarySgd: string;
  availableFrom: string;
  currentLocation: string;
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
  willingLiveIn: true,
  comfortableWithChildren: true,
  comfortableWithPets: false,
  halal: false,
  allergies: '',
  expectedSalarySgd: '',
  availableFrom: '',
  currentLocation: '',
  photoKey: null,
  photoPreviewUrl: null,
  languages: [],
  skills: ZERO_VECTOR,
};

const TOTAL_STEPS = 5;

/**
 * Five-step onboarding for helpers: identity → background → languages →
 * 5-vector self-rating → photo + expectations. Each step validates before
 * advancing. The whole form posts at the end so a back-button mid-flow
 * doesn't leave a partial profile in the DB.
 */
export default function HelperOnboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Reference data + existing profile (in case the helper resumes the wizard).
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);
  const [loaded, setLoaded] = useState(false);

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
    return () => {
      cancelled = true;
    };
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

  function validateStep(s: number): string | null {
    switch (s) {
      case 1:
        if (!form.displayFirstName.trim()) return 'Tell us what to call you on your card.';
        return null;
      case 2:
        if (!form.nationality) return 'Pick your nationality.';
        if (!form.dateOfBirth) return 'Add your date of birth.';
        if (!form.yearsExperience || isNaN(Number(form.yearsExperience))) {
          return 'Years of experience must be a number (use 0 if this is your first time).';
        }
        if (Number(form.yearsExperience) < 0) return 'Experience can\'t be negative.';
        return null;
      case 3:
        if (form.languages.length === 0) {
          return 'Choose at least one language so families can communicate with you.';
        }
        return null;
      case 4:
        if (vectorSum(form.skills) !== 100) {
          return 'Your skill points must add up to exactly 100.';
        }
        return null;
      case 5:
        return null; // photo + expectations are optional
      default:
        return null;
    }
  }

  async function next() {
    const err = validateStep(step);
    if (err) {
      setServerError(err);
      return;
    }
    setServerError(null);
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      await submit();
    }
  }

  function back() {
    setServerError(null);
    setStep((s) => Math.max(1, s - 1));
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

  async function submit() {
    setSubmitting(true);
    setServerError(null);
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
        willingLiveIn: form.willingLiveIn,
        comfortableWithChildren: form.comfortableWithChildren,
        comfortableWithPets: form.comfortableWithPets,
        halal: form.halal,
        allergies: form.allergies.trim() || null,
        expectedSalarySgd: form.expectedSalarySgd ? Number(form.expectedSalarySgd) : null,
        availableFrom: form.availableFrom || null,
        currentLocation: form.currentLocation.trim() || null,
        photoUrl: form.photoKey,
        skills: form.skills,
        languages: form.languages,
      };
      await saveHelperProfile(req);
      nav('/matches', { replace: true });
    } catch (err) {
      setServerError(asMessage(err, 'Could not save your profile. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="max-w-xl mx-auto px-4 md:px-6 py-20 text-center text-ink-500">Loading…</div>
    );
  }

  const stepConfig = [
    { title: 'Let\'s start with your name', subhead: 'This is what families will see on your card.' },
    { title: 'A bit about you',           subhead: 'Just the basics — you can add more later.' },
    { title: 'Languages you speak',       subhead: 'Pick the ones you\'re comfortable using day-to-day.' },
    { title: 'Your strengths',            subhead: 'Distribute 100 points across these five areas.' },
    { title: 'Your photo & expectations', subhead: 'A clear face shot helps families say hello.' },
  ][step - 1];

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      title={stepConfig.title}
      subhead={stepConfig.subhead}
      error={serverError}
      footer={
        <>
          <SecondaryButton onClick={back} disabled={step === 1 || submitting}>
            ← Back
          </SecondaryButton>
          <PrimaryButton onClick={next} disabled={submitting || uploadingPhoto}>
            {submitting
              ? 'Saving…'
              : step === TOTAL_STEPS
              ? 'Save & meet families →'
              : 'Next →'}
          </PrimaryButton>
        </>
      }
    >
      {step === 1 && <Step1 form={form} update={update} />}
      {step === 2 && <Step2 form={form} update={update} />}
      {step === 3 && (
        <Step3 form={form} update={update} languages={languages} />
      )}
      {step === 4 && (
        <FiveVectorEditor
          value={form.skills}
          onChange={(v) => update('skills', v)}
          labels={skillLabels}
          helpText="No wrong answers — be honest. Families weight these dimensions on their side, so a precise self-rating leads to better matches."
        />
      )}
      {step === 5 && (
        <Step5
          form={form}
          update={update}
          uploading={uploadingPhoto}
          onPhotoChange={onPhotoChange}
        />
      )}
    </WizardShell>
  );
}

// -------- Steps --------

function Step1({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <>
      <WizardField label="Display first name" hint="What employers see">
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
    </>
  );
}

function Step2({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <>
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
    </>
  );
}

function Step3({
  form,
  update,
  languages,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  languages: LanguageOption[];
}) {
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
      form.languages.map((l) => (l.languageId === id ? { ...l, proficiency: prof } : l))
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-500">Tap to add. We'll ask how comfortable you are with each.</p>
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
        <div className="space-y-3 pt-2">
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
  );
}

function Step5({
  form,
  update,
  uploading,
  onPhotoChange,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  uploading: boolean;
  onPhotoChange: (file: File) => void;
}) {
  return (
    <>
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
            {uploading ? 'Uploading…' : form.photoKey ? 'Replace photo' : 'Choose a photo'}
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

      <WizardField label="Live-in arrangement">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update('willingLiveIn', true)}
            aria-pressed={form.willingLiveIn}
            className={`rounded-2xl px-4 py-3 border text-sm transition-colors ${
              form.willingLiveIn
                ? 'bg-sage-50 border-sage-400 ring-2 ring-sage-400/30 text-sage-900'
                : 'bg-white border-cream-200 hover:border-sage-400/60 text-ink-900'
            }`}
          >
            Willing to live in
          </button>
          <button
            type="button"
            onClick={() => update('willingLiveIn', false)}
            aria-pressed={!form.willingLiveIn}
            className={`rounded-2xl px-4 py-3 border text-sm transition-colors ${
              !form.willingLiveIn
                ? 'bg-sage-50 border-sage-400 ring-2 ring-sage-400/30 text-sage-900'
                : 'bg-white border-cream-200 hover:border-sage-400/60 text-ink-900'
            }`}
          >
            Live-out only
          </button>
        </div>
      </WizardField>

      <WizardField label="Household preferences" hint="Families see this — be honest so you find the right fit">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: 'comfortableWithChildren', label: 'OK with children' },
              { key: 'comfortableWithPets',     label: 'OK with pets' },
              { key: 'halal',                   label: 'Halal' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => update(key, !form[key])}
              aria-pressed={form[key]}
              className={`rounded-2xl px-3 py-2.5 border text-sm transition-colors ${
                form[key]
                  ? 'bg-sage-50 border-sage-400 ring-2 ring-sage-400/30 text-sage-900'
                  : 'bg-white border-cream-200 hover:border-sage-400/60 text-ink-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </WizardField>

      <WizardField label="Allergies" hint="Optional — e.g. cats, nuts, shellfish">
        <input
          value={form.allergies}
          onChange={(e) => update('allergies', e.target.value)}
          placeholder="e.g. Allergic to cats and dogs"
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
    </>
  );
}

// -------- Hydration helpers --------

function toFormState(p: HelperProfile): FormState {
  return {
    displayFirstName: p.displayFirstName ?? '',
    fullName: p.fullName ?? '',
    nationality: p.nationality,
    dateOfBirth: p.dateOfBirth ?? '',
    yearsExperience: String(p.yearsExperience ?? 0),
    bio: p.bio ?? '',
    willingLiveIn: p.willingLiveIn,
    comfortableWithChildren: p.comfortableWithChildren,
    comfortableWithPets: p.comfortableWithPets,
    halal: p.halal,
    allergies: p.allergies ?? '',
    expectedSalarySgd: p.expectedSalarySgd != null ? String(p.expectedSalarySgd) : '',
    availableFrom: p.availableFrom ?? '',
    currentLocation: p.currentLocation ?? '',
    // The backend hands us a signed GET URL on read; show it as a preview but
    // we still need a fresh upload (and fresh key) if the user replaces it.
    photoKey: null,
    photoPreviewUrl: p.photoUrl,
    languages: p.languages,
    skills: p.skills,
  };
}
