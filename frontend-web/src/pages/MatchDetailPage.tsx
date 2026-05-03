import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { asMessage } from '../lib/api';
import { fetchMatches, type MatchView, SKILL_KEYS } from '../lib/profile';
import { useAuthStore } from '../lib/auth';
import { fetchWallet, unlock } from '../lib/wallet';
import { expressInterest, withdrawInterest } from '../lib/profile';
import { helperArchetype } from '../components/SkillRadar';

const SKILL_LABELS: Record<string, string> = {
  infant:   'Infant care',
  elderly:  'Elderly care',
  cooking:  'Cooking',
  house:    'Housekeeping',
  attitude: 'Attitude',
};

const SKILL_ICONS: Record<string, string> = {
  infant:   '👶',
  elderly:  '🧓',
  cooking:  '🍳',
  house:    '🧹',
  attitude: '✨',
};

const NATIONALITY_LABELS: Record<string, string> = {
  PHL: 'Philippines',
  IDN: 'Indonesia',
  MMR: 'Myanmar',
  OTHER: 'Other',
};

const NATIONALITY_FLAGS: Record<string, string> = {
  PHL: '🇵🇭',
  IDN: '🇮🇩',
  MMR: '🇲🇲',
  OTHER: '🌏',
};

const COUNTRY_OPTIONS: { code: string; label: string; flag: string }[] = [
  { code: 'SG', label: 'Singapore',   flag: '🇸🇬' },
  { code: 'PH', label: 'Philippines', flag: '🇵🇭' },
  { code: 'ID', label: 'Indonesia',   flag: '🇮🇩' },
  { code: 'MM', label: 'Myanmar',     flag: '🇲🇲' },
  { code: 'HK', label: 'Hong Kong',   flag: '🇭🇰' },
  { code: 'TW', label: 'Taiwan',      flag: '🇹🇼' },
  { code: 'MY', label: 'Malaysia',    flag: '🇲🇾' },
  { code: 'OTHER', label: 'Other',    flag: '🌏' },
];

const DUTY_LABELS: Record<string, string> = {
  infant_care:  '👶 Infant care',
  child_care:   '👧 Child care',
  elderly_care: '🧓 Elderly care',
  dementia:     '🧠 Dementia care',
  cooking:      '🍳 Cooking',
  housekeeping: '🧹 Housekeeping',
  school_runs:  '🚸 School runs',
  medication:   '💊 Medication',
  driving:      '🚗 Driving',
  pet_care:     '🐾 Pet care',
  grocery:      '🛒 Grocery shopping',
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

function useCountdown(expiresAt: string | null): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!expiresAt) { setLabel(null); return; }
    function tick() {
      const diff = new Date(expiresAt!).getTime() - Date.now();
      if (diff <= 0) { setLabel('Expired'); return; }
      const totalMinutes = Math.floor(diff / 60_000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const mins = totalMinutes % 60;
      if (days > 0) setLabel(`${days}d ${hours}h left`);
      else if (hours > 0) setLabel(`${hours}h ${mins}m left`);
      else setLabel(`${mins}m left`);
    }
    tick();
    const h = setInterval(tick, 60_000);
    return () => clearInterval(h);
  }, [expiresAt]);
  return label;
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [match, setMatch] = useState<MatchView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [interestInFlight, setInterestInFlight] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const countdown = useCountdown(match?.interestExpiresAt ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchMatches();
        if (cancelled) return;
        const found = list.find((m) => m.counterpartyUserId === id) ?? null;
        if (!found) setError('That match is no longer in your list.');
        setMatch(found);
      } catch (err) {
        if (!cancelled) setError(asMessage(err, 'Could not load match.'));
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (user?.role !== 'EMPLOYER') return;
    let cancelled = false;
    (async () => {
      try {
        const w = await fetchWallet();
        if (!cancelled) setBalance(w.balance);
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [user?.role]);

  async function toggleInterest() {
    if (!match || interestInFlight) return;
    setInterestInFlight(true);
    setInterestError(null);
    try {
      if (match.interested) {
        await withdrawInterest(match.counterpartyUserId);
        setMatch({ ...match, interested: false, interestExpiresAt: null });
      } else {
        const { interestExpiresAt } = await expressInterest(match.counterpartyUserId);
        setMatch({ ...match, interested: true, interestExpiresAt });
      }
    } catch (err) {
      // If the interceptor already signed us out (role mismatch), navigate to login.
      if (!useAuthStore.getState().accessToken) {
        nav('/login?next=' + encodeURIComponent(window.location.pathname) + '&reason=wrong-account');
        return;
      }
      setInterestError(asMessage(err, 'Could not update your interest.'));
    } finally {
      setInterestInFlight(false);
    }
  }

  async function unlockAndChat() {
    if (!match || unlocking) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const result = await unlock(match.counterpartyUserId);
      setBalance(result.balanceAfter);
      nav(`/chats/${match.counterpartyUserId}`);
    } catch (err) {
      setUnlockError(asMessage(err, 'Could not unlock this chat.'));
    } finally {
      setUnlocking(false);
    }
  }

  if (error) {
    return (
      <Centered>
        <p className="text-ink-700 mb-6">{error}</p>
        <Link to="/matches" className="text-sage-700 hover:text-sage-900">← Back to matches</Link>
      </Centered>
    );
  }
  if (!match) return <Centered>Loading…</Centered>;

  const isEmployer = user?.role === 'EMPLOYER';
  const locked = isEmployer && !match.unlocked;
  const flag = isEmployer && match.subtitle ? NATIONALITY_FLAGS[match.subtitle] ?? '🌏' : null;
  const natLabel = isEmployer && match.subtitle ? NATIONALITY_LABELS[match.subtitle] ?? match.subtitle : null;
  const archetype = isEmployer && match.scores ? helperArchetype(match.scores) : null;
  const visibleName = locked ? maskedName(match.displayName) : match.displayName;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <Link to="/matches" className="text-sage-700 hover:text-sage-900 text-sm">← Back to matches</Link>

      {/* ── Hero card ── */}
      <div className="mt-4 rounded-3xl border border-cream-200 bg-white p-5 md:p-7 shadow-soft">
        {/* Name + score row */}
        <div className="flex items-start gap-4">
          {locked
            ? <LockedAvatar src={match.photoUrl} />
            : <Avatar src={match.photoUrl} fallback={match.displayName} />
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="serif text-2xl md:text-3xl text-sage-900 leading-tight">{visibleName}</h1>
                {isEmployer && (
                <div className="text-sm text-ink-500 mt-1">
                  {[
                    flag && natLabel ? `${flag} ${natLabel}` : natLabel,
                    match.age != null && `${match.age} years old`,
                    match.yearsExperience != null && `${match.yearsExperience} yrs experience`,
                  ].filter(Boolean).join(' · ')}
                </div>
              )}
              </div>
              <ScoreBadge score={match.score} />
            </div>
            {archetype && (
              <span className={`mt-2 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                archetype.specialist ? 'bg-clay-500/10 text-clay-600' : 'bg-cream-200 text-ink-700'
              }`}>
                {archetype.label}
              </span>
            )}
          </div>
        </div>

        {/* Skill bars — directly under name/age/exp */}
        {match.scores && (
          <div className="mt-5 pt-5 border-t border-cream-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-widest text-ink-500">
                {isEmployer ? 'Her 100 points' : 'What they prioritise'}
              </div>
              <div className="text-[10px] text-sage-700 font-medium">= 100 ✓</div>
            </div>
            <div className="space-y-2.5">
              {SKILL_KEYS.map((key) => (
                <div key={key}>
                  <div className="flex justify-between text-sm text-ink-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span>{SKILL_ICONS[key]}</span>
                      {SKILL_LABELS[key]}
                    </span>
                    <span className="text-sage-700 font-semibold tabular-nums">{match.scores[key]} pts</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden">
                    <div className="h-full bg-sage-500 rounded-full" style={{ width: `${match.scores[key]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* At a glance — employer view, inside the hero card below skill bars */}
        {isEmployer && (
          <div className="mt-5 pt-5 border-t border-cream-200 space-y-4">
            <div className="text-xs uppercase tracking-widest text-ink-500">At a glance</div>

            {locked && (
              <div className="flex items-center gap-2 rounded-2xl bg-cream-50 border border-cream-200 px-3 py-2.5">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-ink-400 shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1C9.24 1 7 3.24 7 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
                </svg>
                <span className="text-xs text-ink-600">Name &amp; contact details are hidden until you unlock this profile.</span>
              </div>
            )}

            {match.bio && (
              <p className="text-sm text-ink-700 leading-relaxed">{match.bio}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {match.willingLiveIn != null && (
                <div className="rounded-2xl bg-cream-50 border border-cream-200 p-3">
                  <div className="text-[11px] text-ink-500 uppercase tracking-wide mb-1">Live-in</div>
                  <div className="text-sm font-medium text-ink-900">{match.willingLiveIn ? 'Open to live-in' : 'Live-out only'}</div>
                </div>
              )}
              {match.expectedSalarySgd != null && (
                <div className="rounded-2xl bg-cream-50 border border-cream-200 p-3">
                  <div className="text-[11px] text-ink-500 uppercase tracking-wide mb-1">Expected salary</div>
                  {locked ? (
                    <div className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-ink-400" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1C9.24 1 7 3.24 7 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
                      </svg>
                      <span className="text-xs text-ink-400 italic">Unlocks after connection</span>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-ink-900">SGD {match.expectedSalarySgd}/mo</div>
                  )}
                </div>
              )}
              {match.availableFrom && (
                <div className="rounded-2xl bg-cream-50 border border-cream-200 p-3">
                  <div className="text-[11px] text-ink-500 uppercase tracking-wide mb-1">Available from</div>
                  {locked ? (
                    <div className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-ink-400" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1C9.24 1 7 3.24 7 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
                      </svg>
                      <span className="text-xs text-ink-400 italic">Unlocks after connection</span>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-ink-900">
                      {new Date(match.availableFrom).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              )}
              {match.currentLocation && (
                <div className="rounded-2xl bg-cream-50 border border-cream-200 p-3">
                  <div className="text-[11px] text-ink-500 uppercase tracking-wide mb-1">Currently in</div>
                  {locked ? (
                    <div className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-ink-400" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1C9.24 1 7 3.24 7 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
                      </svg>
                      <span className="text-xs text-ink-400 italic">Unlocks after connection</span>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-ink-900">{match.currentLocation}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {match.comfortableWithChildren && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-cream-100 border border-cream-200 text-ink-700">👧 OK with children</span>
              )}
              {match.comfortableWithPets && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-cream-100 border border-cream-200 text-ink-700">🐾 OK with pets</span>
              )}
              {match.halal && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-cream-100 border border-cream-200 text-ink-700">🌙 Halal</span>
              )}
              {match.allergies && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-cream-100 border border-cream-200 text-ink-700">⚠️ {match.allergies}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Helper story (employer view only) ── */}
      {isEmployer && (match.workHistory?.length ?? 0) > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3">
            <p className="hand text-sage-700 text-lg">their story</p>
          </div>

          {/* Self-reported notice */}
          <div className="mb-4 rounded-2xl bg-white border border-cream-200 px-4 py-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-cream-100 flex items-center justify-center text-sage-700 shrink-0 text-sm">ⓘ</div>
            <p className="text-xs text-ink-700">
              <strong className="text-ink-900">Self-reported.</strong> Written by the helper in their own words, like a CV. Verified reviews from HelperHaven employers will appear here once earned.
            </p>
          </div>

          {/* Timeline entries */}
          <div className="relative pl-7 border-l-2 border-cream-200 space-y-4">
            {match.workHistory!.map((entry) => {
              const meta = COUNTRY_OPTIONS.find((c) => c.code === entry.country) ?? COUNTRY_OPTIONS[COUNTRY_OPTIONS.length - 1];
              const dateLabel = `${fmtYearMonth(entry.startDate)} – ${entry.isCurrent ? 'present' : fmtYearMonth(entry.endDate)}`;
              const dur = durationLabel(entry.startDate, entry.endDate, entry.isCurrent);
              return (
                <div key={entry.id} className="relative">
                  <div className={`absolute -left-[37px] top-4 w-4 h-4 rounded-full ring-4 ring-cream-50 ${entry.isCurrent ? 'bg-sage-500' : 'bg-sage-300'}`} />
                  <div className="rounded-2xl bg-white border border-cream-200 p-5 shadow-soft">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-lg">{meta.flag}</span>
                      <span className="serif text-base font-bold text-ink-900">
                        {meta.label}{entry.location ? ` · ${entry.location}` : ''}
                      </span>
                      {entry.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-[10px] font-semibold uppercase tracking-widest">Current</span>
                      )}
                    </div>
                    <div className="text-xs text-ink-500 mb-3">
                      {dateLabel}{dur && ` · ${dur}`}
                    </div>
                    {entry.description && (
                      <p className="text-sm text-ink-700 mb-3 leading-relaxed">{entry.description}</p>
                    )}
                    {entry.duties && entry.duties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {entry.duties.map((d) => (
                          <span key={d} className="px-2.5 py-1 rounded-full bg-cream-100 text-ink-700 text-xs">
                            {DUTY_LABELS[d] ?? d}
                          </span>
                        ))}
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
            <div className="relative">
              <div className="absolute -left-[37px] top-1 w-4 h-4 rounded-full bg-cream-200 ring-4 ring-cream-50" />
              <p className="text-xs text-ink-500 italic pt-0.5">Beginning of known history</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Family details (helper view) ── */}
      {!isEmployer && (
        <div className="mt-5 rounded-3xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft space-y-4">
          <h2 className="serif text-lg text-sage-900">About this family</h2>

          {/* Hiring purpose */}
          {match.bio && (
            <div className="rounded-2xl bg-cream-50 border border-cream-200 p-4">
              <p className="text-xs text-ink-500 uppercase tracking-wide mb-1.5">What they're looking for</p>
              <p className="text-sm text-ink-800 leading-relaxed">{match.bio}</p>
            </div>
          )}

          {/* Household snapshot */}
          <div className="grid grid-cols-3 gap-3">
            {match.householdSize != null && (
              <div className="rounded-2xl bg-cream-50 border border-cream-200 p-3 text-center">
                <div className="text-xl font-bold text-sage-900">{match.householdSize}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">people</div>
              </div>
            )}
            {match.numChildren != null && (
              <div className="rounded-2xl bg-cream-50 border border-cream-200 p-3 text-center">
                <div className="text-xl font-bold text-sage-900">{match.numChildren}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">children</div>
              </div>
            )}
            {match.numElderly != null && (
              <div className="rounded-2xl bg-cream-50 border border-cream-200 p-3 text-center">
                <div className="text-xl font-bold text-sage-900">{match.numElderly}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">elderly</div>
              </div>
            )}
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap gap-2">
            {match.subtitle && (
              <span className="px-3 py-1.5 rounded-full text-xs bg-cream-100 border border-cream-200 text-ink-700">🏠 {match.subtitle}</span>
            )}
            {match.district && (
              <span className="px-3 py-1.5 rounded-full text-xs bg-cream-100 border border-cream-200 text-ink-700">📍 {match.district}</span>
            )}
            {match.hasPets && (
              <span className="px-3 py-1.5 rounded-full text-xs bg-cream-100 border border-cream-200 text-ink-700">🐾 Has pets</span>
            )}
            {match.purposeTags?.map((tag) => (
              <span key={tag} className="px-3 py-1.5 rounded-full text-xs bg-sage-50 border border-sage-400/30 text-sage-900">
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>


          {/* Languages */}
          {match.preferredLanguages?.length > 0 && (
            <div>
              <p className="text-xs text-ink-500 uppercase tracking-wide mb-2">Languages at home</p>
              <div className="flex flex-wrap gap-2">
                {match.preferredLanguages.map((l) => (
                  <span key={l} className="px-3 py-1.5 rounded-full text-xs bg-cream-100 border border-cream-200 text-ink-700">{l}</span>
                ))}
              </div>
            </div>
          )}

          {/* Off-day policy */}
          {match.offDayPolicy && (
            <div>
              <p className="text-xs text-ink-500 uppercase tracking-wide mb-1">Day off</p>
              <p className="text-sm text-ink-900">{match.offDayPolicy}</p>
            </div>
          )}
        </div>
      )}

      {/* ── CTA ── */}
      {isEmployer ? (
        <div className="mt-5 rounded-3xl bg-sage-900 text-cream-100 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="serif text-lg font-bold mb-0.5">
              {match.unlocked ? 'Chat is open' : 'Ready to connect?'}
            </div>
            <div className="text-sm text-sage-400">
              {match.unlocked
                ? "You've unlocked this conversation — contact details are visible in chat."
                : balance !== null
                  ? `You have ${balance} ${balance === 1 ? 'credit' : 'credits'}. Credit is refunded if no reply in 48 h.`
                  : '1 credit · refunded if no reply in 48 hours.'}
            </div>
            {match.interested && (
              <div className="mt-2 text-xs text-clay-300">
                ✋ This helper raised their hand for your family.
                {countdown && <span className="ml-1 opacity-70">({countdown})</span>}
              </div>
            )}
          </div>
          <button
            onClick={unlockAndChat}
            disabled={unlocking || (balance === 0 && !match.unlocked)}
            className="shrink-0 px-6 py-3 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600 disabled:opacity-60 transition-colors"
          >
            {unlocking ? 'Opening…' : match.unlocked ? 'Open chat →' : balance === 0 ? 'Out of credits' : 'Unlock chat (1 credit) →'}
          </button>
          {unlockError && <p className="text-xs text-clay-300 mt-1 md:mt-0">{unlockError}</p>}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl bg-sage-900 text-cream-100 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="serif text-lg font-bold mb-0.5">
              {match.interested ? 'Interest expressed ✓' : 'Raise your hand'}
            </div>
            <div className="text-sm text-sage-400">
              {match.interested ? (
                <>
                  This family can see you&apos;re interested. They&apos;ll unlock the chat if they want to connect.
                  {countdown && <span className="ml-1.5">⏳ {countdown}</span>}
                </>
              ) : (
                'Let this family know you\'re open to working with them. They decide whether to reach out.'
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 shrink-0">
            <button
              onClick={toggleInterest}
              disabled={interestInFlight}
              className={`px-6 py-3 rounded-full font-medium disabled:opacity-60 transition-colors ${
                match.interested
                  ? 'bg-sage-700 text-cream-100 hover:bg-sage-600'
                  : 'bg-clay-500 text-white hover:bg-clay-600'
              }`}
            >
              {interestInFlight ? '…' : match.interested ? 'Withdraw interest' : 'Raise my hand ✋'}
            </button>
            {interestError && (
              <p className="text-xs text-clay-300 max-w-[220px]">
                {interestError}
                {interestError.toLowerCase().includes('role') || interestError.includes('403') ? (
                  <> · <button type="button" onClick={useAuthStore.getState().signOut} className="underline hover:text-clay-200">Sign out</button></>
                ) : null}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function maskedName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return displayName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  if (src) {
    return <img src={src} alt="" className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover bg-cream-200 flex-shrink-0" />;
  }
  const initials = fallback.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-sage-50 text-sage-900 flex items-center justify-center font-semibold text-2xl flex-shrink-0">
      {initials || '·'}
    </div>
  );
}

function LockedAvatar({ src }: { src: string | null }) {
  return (
    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl relative overflow-hidden bg-cream-200 flex-shrink-0">
      {src && (
        <img src={src} alt="" className="w-20 h-20 md:w-24 md:h-24 object-cover blur-md scale-110 opacity-50" />
      )}
      {!src && <div className="w-full h-full bg-gradient-to-br from-sage-100 to-cream-300" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-ink-500" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 1C9.24 1 7 3.24 7 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
        </svg>
        <span className="text-[10px] text-ink-600 font-medium text-center leading-tight px-2">Private until mutual</span>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tier = score >= 70 ? 'bg-clay-500 text-white' : score >= 50 ? 'bg-sage-50 text-sage-900 border border-sage-400/40' : 'bg-cream-200 text-ink-700';
  return (
    <span className={`shrink-0 rounded-full text-sm font-semibold tabular-nums px-3 py-1.5 ${tier}`}>
      {score.toFixed(0)}% match
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 md:px-6 py-20 text-center text-ink-700">{children}</div>
  );
}
