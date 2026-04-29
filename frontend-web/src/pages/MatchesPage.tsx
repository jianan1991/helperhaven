import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../lib/auth';
import { asMessage } from '../lib/api';
import { fetchMatches, type MatchView } from '../lib/profile';
import SkillRadar, { helperArchetype } from '../components/SkillRadar';

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
        if (!cancelled) {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setProfileNotReady(true);
          } else {
            setError(asMessage(err, 'Could not load matches.'));
          }
          setMatches([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (matches === null) return <Centered>Loading matches…</Centered>;

  if (profileNotReady) {
    return (
      <Centered>
        <h1 className="serif text-2xl text-sage-900 mb-2">One small thing first</h1>
        <p className="text-ink-500 mb-6 text-sm">
          Finish your profile so we can find people who'll fit your home.
        </p>
        <Link to="/profile" className="inline-block px-6 py-3 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600">
          Finish onboarding →
        </Link>
      </Centered>
    );
  }

  if (error) return <Centered>{error}</Centered>;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
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
        <ul className="grid md:grid-cols-2 gap-4 md:gap-5">
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

function MatchCard({ match, viewerRole }: { match: MatchView; viewerRole: string | null }) {
  const isEmployer = viewerRole === 'EMPLOYER';
  const flag = isEmployer && match.subtitle ? NATIONALITY_FLAGS[match.subtitle] ?? '🌏' : null;
  const natLabel = isEmployer && match.subtitle ? NATIONALITY_LABELS[match.subtitle] ?? match.subtitle : match.subtitle;
  const archetype = match.scores ? helperArchetype(match.scores) : null;

  return (
    <Link
      to={`/matches/${match.counterpartyUserId}`}
      className="block rounded-3xl bg-white border border-cream-200 hover:shadow-lift hover:border-sage-400/40 transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <Avatar src={match.photoUrl} fallback={match.displayName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-ink-900 serif text-lg leading-tight">{match.displayName}</div>
              <div className="text-xs text-ink-500 mt-0.5">
                {[
                  flag && natLabel ? `${flag} ${natLabel}` : natLabel,
                  match.age != null && `${match.age} yrs`,
                  match.yearsExperience != null && `${match.yearsExperience} yrs exp`,
                ].filter(Boolean).join(' · ')}
              </div>
              {archetype && (
                <span className={`mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                  archetype.specialist ? 'bg-clay-500/10 text-clay-600' : 'bg-cream-200 text-ink-700'
                }`}>
                  {archetype.label}
                </span>
              )}
            </div>
            <ScoreBadge score={match.score} />
          </div>
          {match.bio && (
            <p className="mt-2 text-sm text-ink-700 line-clamp-2 leading-relaxed">{match.bio}</p>
          )}
        </div>
      </div>

      {/* Radar — full width, centred */}
      {match.scores && (
        <div className="px-6 pb-5 flex justify-center">
          <div className="w-full max-w-sm">
            <SkillRadar scores={match.scores} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 pb-5 pt-1 flex items-center justify-end border-t border-cream-200 mt-1">
        <span className="text-xs font-medium text-clay-500">View profile →</span>
      </div>
    </Link>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  if (src) {
    return <img src={src} alt="" className="w-14 h-14 rounded-2xl object-cover bg-cream-200 flex-shrink-0" />;
  }
  const initials = fallback.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <div className="w-14 h-14 rounded-2xl bg-sage-50 text-sage-900 flex items-center justify-center font-semibold text-base flex-shrink-0">
      {initials || '·'}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tier = score >= 70 ? 'bg-clay-500 text-white' : score >= 50 ? 'bg-sage-50 text-sage-900 border border-sage-400/40' : 'bg-cream-200 text-ink-700';
  return (
    <span className={`shrink-0 rounded-full text-xs font-semibold tabular-nums px-2.5 py-1 ${tier}`}>
      {score.toFixed(0)}%
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
