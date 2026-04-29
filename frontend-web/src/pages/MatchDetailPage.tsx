import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { asMessage } from '../lib/api';
import { fetchMatches, type MatchView, SKILL_KEYS } from '../lib/profile';
import { useAuthStore } from '../lib/auth';
import { fetchWallet, unlock } from '../lib/wallet';
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

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [match, setMatch] = useState<MatchView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

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
  const flag = isEmployer && match.subtitle ? NATIONALITY_FLAGS[match.subtitle] ?? '🌏' : null;
  const natLabel = isEmployer && match.subtitle ? NATIONALITY_LABELS[match.subtitle] ?? match.subtitle : match.subtitle;
  const archetype = match.scores ? helperArchetype(match.scores) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <Link to="/matches" className="text-sage-700 hover:text-sage-900 text-sm">← Back to matches</Link>

      {/* ── Hero card ── */}
      <div className="mt-4 rounded-3xl border border-cream-200 bg-white p-5 md:p-7 shadow-soft">
        {/* Name + score row */}
        <div className="flex items-start gap-4">
          <Avatar src={match.photoUrl} fallback={match.displayName} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="serif text-2xl md:text-3xl text-sage-900 leading-tight">{match.displayName}</h1>
                <div className="text-sm text-ink-500 mt-1">
                  {[
                    flag && natLabel ? `${flag} ${natLabel}` : natLabel,
                    match.age != null && `${match.age} years old`,
                    match.yearsExperience != null && `${match.yearsExperience} yrs experience`,
                  ].filter(Boolean).join(' · ')}
                </div>
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
              <div className="text-xs uppercase tracking-widest text-ink-500">Her 100 points</div>
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
      </div>

      {/* ── Experience ── */}
      {match.bio && (
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

          {/* Timeline entry */}
          <div className="relative pl-7 border-l-2 border-cream-200">
            <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-sage-500 ring-4 ring-cream-50" />
            <div className="rounded-2xl bg-white border border-cream-200 p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{flag ?? '🌏'}</span>
                <span className="serif text-lg font-bold text-ink-900">Singapore</span>
                {match.yearsExperience != null && match.yearsExperience > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-[10px] font-semibold uppercase tracking-widest">
                    {match.yearsExperience} yrs exp
                  </span>
                )}
              </div>
              <div className="text-sm text-ink-500 mb-3">{natLabel} · domestic helper</div>
              <p className="text-ink-700 text-sm leading-relaxed">{match.bio}</p>

              {/* Skill tags from top reasons */}
              {match.reasons && match.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {match.reasons.map((r) => (
                    <span key={r} className="px-2.5 py-1 rounded-full bg-cream-100 text-ink-700 text-xs">
                      {SKILL_ICONS[r] ?? '·'} {SKILL_LABELS[r] ?? r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Timeline end marker */}
          <div className="relative pl-7 mt-4">
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-cream-200 ring-4 ring-cream-50" />
            <p className="text-xs text-ink-500 italic">Beginning of known history</p>
          </div>
        </div>
      )}

      {/* ── Personal details (only after unlock) ── */}
      {match.unlocked && (
        <div className="mt-4 rounded-2xl bg-sage-50 border border-sage-400/20 p-4 md:p-5">
          <div className="text-xs uppercase tracking-wide text-sage-700 font-medium mb-3">Personal details · unlocked</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {match.comfortableWithChildren && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-white border border-sage-400/30 text-sage-900">👧 OK with children</span>
            )}
            {match.comfortableWithPets && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-white border border-sage-400/30 text-sage-900">🐾 OK with pets</span>
            )}
            {match.halal && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-white border border-sage-400/30 text-sage-900">🌙 Halal</span>
            )}
            {!match.comfortableWithChildren && !match.comfortableWithPets && !match.halal && (
              <span className="text-sm text-ink-500 italic">No specific preferences noted.</span>
            )}
          </div>
          {match.allergies && (
            <p className="text-sm text-ink-700 mt-1">
              <span className="font-medium">Allergies:</span> {match.allergies}
            </p>
          )}
        </div>
      )}

      {/* ── CTA ── */}
      <div className="mt-5 rounded-3xl bg-sage-900 text-cream-100 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="serif text-lg font-bold mb-0.5">
            {match.unlocked ? 'Chat is open' : 'Ready to connect?'}
          </div>
          <div className="text-sm text-sage-400">
            {match.unlocked
              ? "You've already unlocked this conversation."
              : user?.role === 'EMPLOYER'
                ? balance !== null
                  ? `You have ${balance} ${balance === 1 ? 'credit' : 'credits'}. Credit is refunded if no reply in 48 h.`
                  : '1 credit · refunded if no reply in 48 hours.'
                : 'Open the chat to connect with this family.'}
          </div>
        </div>
        <button
          onClick={unlockAndChat}
          disabled={unlocking || (user?.role === 'EMPLOYER' && balance === 0 && !match.unlocked)}
          className="shrink-0 px-6 py-3 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600 disabled:opacity-60 transition-colors"
        >
          {unlocking
            ? 'Opening…'
            : match.unlocked
              ? 'Open chat →'
              : user?.role === 'EMPLOYER'
                ? balance === 0 ? 'Out of credits' : 'Unlock chat (1 credit) →'
                : 'Open chat →'}
        </button>
        {unlockError && <p className="text-xs text-clay-300 mt-1 md:mt-0">{unlockError}</p>}
      </div>
    </div>
  );
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
