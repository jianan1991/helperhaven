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
          } else if (axios.isAxiosError(err) && err.response?.status === 403) {
            setError('This account type cannot view matches. Sign out and log in with a helper or family account.');
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
      ) : user?.role === 'EMPLOYER' ? (
        <EmployerMatchList matches={matches} />
      ) : (
        <ul className="grid md:grid-cols-2 gap-4 md:gap-5">
          {matches.map((m) => (
            <li key={m.counterpartyUserId}>
              <MatchCard match={m} viewerRole="HELPER" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
      setLabel(days > 0 ? `${days}d ${hours}h left` : `${hours}h ${totalMinutes % 60}m left`);
    }
    tick();
    const h = setInterval(tick, 60_000);
    return () => clearInterval(h);
  }, [expiresAt]);
  return label;
}

function EmployerMatchList({ matches }: { matches: MatchView[] }) {
  const raised = matches.filter((m) => m.interested);
  const rest   = matches.filter((m) => !m.interested);
  return (
    <div className="space-y-8">
      {raised.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">✋</span>
            <h2 className="serif text-xl text-sage-900">Raised their hand</h2>
            <span className="ml-1 text-xs text-ink-500 bg-cream-200 rounded-full px-2 py-0.5">{raised.length}</span>
          </div>
          <ul className="grid md:grid-cols-2 gap-4 md:gap-5">
            {raised.map((m) => (
              <li key={m.counterpartyUserId}>
                <MatchCard match={m} viewerRole="EMPLOYER" />
              </li>
            ))}
          </ul>
        </section>
      )}
      {rest.length > 0 && (
        <section>
          {raised.length > 0 && (
            <h2 className="serif text-xl text-sage-900 mb-3">Other matches</h2>
          )}
          <ul className="grid md:grid-cols-2 gap-4 md:gap-5">
            {rest.map((m) => (
              <li key={m.counterpartyUserId}>
                <MatchCard match={m} viewerRole="EMPLOYER" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function maskedName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return displayName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function MatchCard({ match, viewerRole }: { match: MatchView; viewerRole: string | null }) {
  const isEmployer = viewerRole === 'EMPLOYER';
  const locked = isEmployer && !match.unlocked;
  const flag = isEmployer && match.subtitle ? NATIONALITY_FLAGS[match.subtitle] ?? '🌏' : null;
  const natLabel = isEmployer && match.subtitle ? NATIONALITY_LABELS[match.subtitle] ?? match.subtitle : match.subtitle;
  const archetype = match.scores ? helperArchetype(match.scores) : null;
  const countdown = useCountdown(match.interested ? (match.interestExpiresAt ?? null) : null);
  const visibleName = locked ? maskedName(match.displayName) : match.displayName;

  return (
    <Link
      to={`/matches/${match.counterpartyUserId}`}
      className="block rounded-3xl bg-white border border-cream-200 hover:shadow-lift hover:border-sage-400/40 transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        {locked ? <LockedAvatar src={match.photoUrl} size="sm" /> : <Avatar src={match.photoUrl} fallback={match.displayName} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-ink-900 serif text-lg leading-tight">{visibleName}</div>
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
              {match.interested && (
                <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blush-100 text-clay-600 border border-blush-200">
                  ✋ {isEmployer ? 'Raised hand' : 'You\'re interested'}
                  {!isEmployer && countdown && <span className="opacity-70">· {countdown}</span>}
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

function LockedAvatar({ src, size }: { src: string | null; size: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-20 h-20 md:w-24 md:h-24' : 'w-14 h-14';
  return (
    <div className={`${dim} rounded-2xl relative overflow-hidden bg-cream-200 flex-shrink-0`}>
      {src && (
        <img src={src} alt="" className={`${dim} object-cover blur-md scale-110 opacity-50`} />
      )}
      {!src && <div className={`${dim} bg-gradient-to-br from-sage-100 to-cream-300`} />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-ink-500" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 1C9.24 1 7 3.24 7 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
        </svg>
        <span className="text-[9px] text-ink-600 font-medium text-center leading-tight px-1">Private</span>
      </div>
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
