import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../lib/auth';
import { asMessage } from '../lib/api';
import { fetchMatches, type MatchView } from '../lib/profile';

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
 * Matches list. Score is rendered as a percentage badge; the top-3 reasons
 * become small chips so the user can see why each row scored well without
 * digging into the raw 5-vector. Tapping a card opens the detail page.
 */
export default function MatchesPage() {
  const user = useAuthStore((s) => s.user);
  const [matches, setMatches] = useState<MatchView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileNotReady, setProfileNotReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setProfileNotReady(false);
      try {
        const list = await fetchMatches();
        if (!cancelled) setMatches(list);
      } catch (err) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setProfileNotReady(true);
        } else {
          setError(asMessage(err, 'Could not load matches.'));
        }
        setMatches([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (matches === null) {
    return <Centered>Loading matches…</Centered>;
  }

  if (profileNotReady) {
    return (
      <Centered>
        <h1 className="serif text-2xl text-sage-900 mb-2">One small thing first</h1>
        <p className="text-ink-500 mb-6 text-sm">
          Finish your profile so we can find people who'll fit your home.
        </p>
        <Link
          to="/profile"
          className="inline-block px-6 py-3 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600"
        >
          Finish onboarding →
        </Link>
      </Centered>
    );
  }

  if (error) return <Centered>{error}</Centered>;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <p className="hand text-sage-700 text-xl">
          {user?.role === 'EMPLOYER' ? 'helpers we found' : 'families looking for you'}
        </p>
        <h1 className="serif text-3xl md:text-4xl text-sage-900 leading-tight mt-1">
          Your top matches
        </h1>
        <p className="text-ink-500 mt-2 text-sm md:text-base">
          Scored from your priorities. Open a card to see the full picture.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-3xl border border-cream-200 bg-cream-50 p-8 md:p-10 text-center">
          <p className="text-ink-700">
            No matches yet — check back once more {user?.role === 'EMPLOYER' ? 'helpers' : 'families'} have signed up.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:gap-4">
          {matches.map((m) => (
            <li key={m.counterpartyUserId}>
              <MatchCard match={m} viewerRole={user?.role ?? null} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchCard({
  match,
  viewerRole,
}: {
  match: MatchView;
  viewerRole: string | null;
}) {
  const subtitle =
    viewerRole === 'EMPLOYER' && match.subtitle
      ? NATIONALITY_LABELS[match.subtitle] ?? match.subtitle
      : match.subtitle;
  return (
    <Link
      to={`/matches/${match.counterpartyUserId}`}
      className="block rounded-3xl border border-cream-200 bg-cream-50 hover:border-sage-400/60 transition-colors p-4 md:p-5"
    >
      <div className="flex items-start gap-4">
        <Avatar src={match.photoUrl} fallback={match.displayName} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-ink-900">{match.displayName}</div>
              <div className="text-xs text-ink-500">
                {[
                  subtitle,
                  match.age != null && `${match.age} yrs`,
                  match.yearsExperience != null && `${match.yearsExperience} yrs exp`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <ScoreBadge score={match.score} />
          </div>

          {match.bio && (
            <p className="mt-2 text-sm text-ink-700 line-clamp-2">{match.bio}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-3">
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
      </div>
    </Link>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover bg-cream-200 flex-shrink-0"
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
    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-sage-50 text-sage-900 flex items-center justify-center font-medium text-lg flex-shrink-0">
      {initials || '·'}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  // Tinted by tier so the eye finds top picks fast.
  const tier =
    score >= 70 ? 'bg-sage-500 text-white' : score >= 50 ? 'bg-sage-50 text-sage-900 border border-sage-400/40' : 'bg-cream-200 text-ink-700';
  return (
    <span
      className={`shrink-0 rounded-full text-xs font-medium tabular-nums px-2.5 py-1 ${tier}`}
    >
      {score.toFixed(0)}% match
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 md:px-6 py-20 text-center">
      <div className="text-ink-700">{children}</div>
    </div>
  );
}
