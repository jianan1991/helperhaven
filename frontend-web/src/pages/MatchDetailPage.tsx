import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { asMessage } from '../lib/api';
import { fetchMatches, type MatchView } from '../lib/profile';
import { useAuthStore } from '../lib/auth';
import { fetchWallet, unlock } from '../lib/wallet';

const REASON_LABELS: Record<string, string> = {
  infant: 'Infant care',
  elderly: 'Elderly care',
  cooking: 'Cooking',
  house: 'Housekeeping',
  attitude: 'Attitude',
};

const NATIONALITY_LABELS: Record<string, string> = {
  PHL: 'Philippines',
  IDN: 'Indonesia',
  MMR: 'Myanmar',
  OTHER: 'Other',
};

/**
 * Detail page for a single match. Shows the full bio, the match-driver reasons,
 * and an "Unlock chat" CTA that calls POST /api/unlocks — burning 1 credit on
 * first unlock for an employer (idempotent on retries) and then navigating to
 * the chat. Helpers hit the same endpoint but don't get charged.
 */
export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [match, setMatch] = useState<MatchView | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Unlock errors are kept separate so we don't unmount the whole page when
  // a click fails (e.g. out of credits) — `error` triggers the early return.
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
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Surface the wallet balance so employers know what they're spending.
  // Helpers call this too — the backend just returns 0 for them.
  useEffect(() => {
    if (user?.role !== 'EMPLOYER') return;
    let cancelled = false;
    (async () => {
      try {
        const w = await fetchWallet();
        if (!cancelled) setBalance(w.balance);
      } catch {
        /* non-fatal: just don't show the balance */
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const subtitle =
    user?.role === 'EMPLOYER' && match.subtitle
      ? NATIONALITY_LABELS[match.subtitle] ?? match.subtitle
      : match.subtitle;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <Link to="/matches" className="text-sage-700 hover:text-sage-900 text-sm">← Back to matches</Link>

      <div className="mt-4 rounded-3xl border border-cream-200 bg-cream-50 p-5 md:p-7 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <Avatar src={match.photoUrl} fallback={match.displayName} />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="serif text-2xl md:text-3xl text-sage-900 leading-tight">
                  {match.displayName}
                </h1>
                <div className="text-sm text-ink-500 mt-1">
                  {[
                    subtitle,
                    match.age != null && `${match.age} years old`,
                    match.yearsExperience != null && `${match.yearsExperience} yrs experience`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <ScoreBadge score={match.score} />
            </div>

            {match.bio && (
              <p className="mt-4 text-ink-700 leading-relaxed text-sm md:text-base whitespace-pre-line">
                {match.bio}
              </p>
            )}

            <div className="mt-5">
              <div className="text-xs uppercase tracking-wide text-ink-500 mb-2">Why we matched</div>
              <div className="flex flex-wrap gap-1.5">
                {match.reasons.map((r) => (
                  <span
                    key={r}
                    className="px-2.5 py-1 rounded-full text-xs bg-sage-50 text-sage-900 border border-sage-400/30"
                  >
                    {REASON_LABELS[r] ?? r}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-cream-200">
              {user?.role === 'EMPLOYER' && balance !== null && (
                <div className="mb-3 text-sm text-ink-700">
                  You have <span className="font-medium tabular-nums">{balance}</span>{' '}
                  {balance === 1 ? 'credit' : 'credits'} remaining.
                </div>
              )}
              <button
                onClick={unlockAndChat}
                disabled={unlocking || (user?.role === 'EMPLOYER' && balance === 0)}
                className="w-full md:w-auto px-6 py-3 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600 disabled:opacity-60"
              >
                {unlocking
                  ? 'Opening chat…'
                  : user?.role === 'EMPLOYER'
                    ? balance === 0
                      ? 'Out of credits'
                      : 'Unlock chat (1 credit) →'
                    : 'Open chat →'}
              </button>
              {unlockError && <p className="text-xs text-clay-600 mt-2">{unlockError}</p>}
              <p className="text-xs text-ink-500 mt-2">
                Credits are refunded automatically if {user?.role === 'EMPLOYER' ? 'this helper' : 'they'} doesn't reply within 48 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover bg-cream-200 flex-shrink-0 mx-auto md:mx-0"
      />
    );
  }
  const initials = fallback
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-sage-50 text-sage-900 flex items-center justify-center font-medium text-3xl flex-shrink-0 mx-auto md:mx-0">
      {initials || '·'}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tier =
    score >= 70 ? 'bg-sage-500 text-white' : score >= 50 ? 'bg-sage-50 text-sage-900 border border-sage-400/40' : 'bg-cream-200 text-ink-700';
  return (
    <span className={`rounded-full text-sm font-medium tabular-nums px-3 py-1.5 ${tier}`}>
      {score.toFixed(0)}% match
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 md:px-6 py-20 text-center text-ink-700">{children}</div>
  );
}
