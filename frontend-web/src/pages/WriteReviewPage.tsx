import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { asMessage } from '../lib/api';
import { useAuthStore } from '../lib/auth';
import { openChat, type ConversationView } from '../lib/chat';
import {
  FLAG_TAGS,
  FLAG_TAG_LABELS,
  getPermitWith,
  writeReview,
  type EnglishLevel,
  type PermitCaseView,
} from '../lib/reviews';

const ENGLISH_LEVELS: { value: EnglishLevel; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'BASIC', label: 'Basic' },
  { value: 'CONVERSATIONAL', label: 'Conversational' },
  { value: 'FLUENT', label: 'Fluent' },
];

const SKILL_KEYS = ['infant', 'elderly', 'cooking', 'house', 'attitude'] as const;
type SkillKey = (typeof SKILL_KEYS)[number];

const SKILL_LABELS: Record<SkillKey, string> = {
  infant: 'Infant care',
  elderly: 'Elderly care',
  cooking: 'Cooking',
  house: 'Housekeeping',
  attitude: 'Attitude',
};

/**
 * Review composer. The URL carries the counterparty's user ID so the same
 * page works whether the user got here from the chat header or a match card.
 *
 * <p>Gate: we hit {@code GET /api/permits/with/{id}} on mount; if no permit
 * case exists at CARD_ISSUED we render the "you can't review yet" state with
 * a link back to chat. The backend enforces the same gate on submit.
 */
export default function WriteReviewPage() {
  const { id: counterpartyUserId } = useParams<{ id: string }>();
  const nav = useNavigate();
  const me = useAuthStore((s) => s.user);

  const [permit, setPermit] = useState<PermitCaseView | null | 'loading'>('loading');
  const [conv, setConv] = useState<ConversationView | null>(null);

  // form state
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [breakdown, setBreakdown] = useState<Record<SkillKey, number>>({
    infant: 20,
    elderly: 20,
    cooking: 20,
    house: 20,
    attitude: 20,
  });
  const [flagTags, setFlagTags] = useState<Set<string>>(new Set());
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel | ''>('');
  const [monthsIn, setMonthsIn] = useState<number | ''>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------- bootstrap: confirm the permit gate + grab counterparty header data
  useEffect(() => {
    if (!counterpartyUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const [pc, c] = await Promise.all([
          getPermitWith(counterpartyUserId),
          openChat(counterpartyUserId).catch(() => null),
        ]);
        if (cancelled) return;
        setPermit(pc);
        setConv(c);
      } catch (err) {
        if (!cancelled) setError(asMessage(err, 'Could not load this review form.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [counterpartyUserId]);

  function adjustSkill(k: SkillKey, v: number) {
    setBreakdown((prev) => ({ ...prev, [k]: v }));
  }

  function toggleFlag(tag: string) {
    setFlagTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const breakdownTotal = SKILL_KEYS.reduce((acc, k) => acc + breakdown[k], 0);
  const breakdownValid = breakdownTotal === 100;

  // Helpers reviewing employers don't fill in the skill breakdown — it doesn't
  // make sense to score a family on infant-care strengths. Hide it for that case.
  const showSkillBreakdown = me?.role === 'EMPLOYER';

  async function onSubmit() {
    if (!counterpartyUserId || submitting) return;
    if (showSkillBreakdown && !breakdownValid) {
      setError(`Skill breakdown must sum to 100 (currently ${breakdownTotal})`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await writeReview({
        revieweeUserId: counterpartyUserId,
        rating,
        body: body.trim() || null,
        skillBreakdown: showSkillBreakdown ? breakdown : null,
        flagTags: Array.from(flagTags),
        englishLevel: englishLevel || null,
        monthsIntoContract: monthsIn === '' ? null : Number(monthsIn),
      });
      nav('/reviews/me');
    } catch (err) {
      setError(asMessage(err, 'Could not submit this review.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (permit === 'loading') {
    return <Centered>Loading…</Centered>;
  }

  if (!permit || !permit.reviewsUnlocked) {
    return (
      <Centered>
        <h1 className="serif text-2xl text-sage-900 mb-2">Reviews unlock once you're hired</h1>
        <p className="text-ink-500 text-sm mb-6">
          Public reviews open after the work permit reaches CARD_ISSUED. For the demo, an
          employer can fast-forward this from the chat header.
        </p>
        <Link
          to={counterpartyUserId ? `/chats/${counterpartyUserId}` : '/chats'}
          className="text-sage-700 hover:text-sage-900"
        >
          ← Back to chat
        </Link>
      </Centered>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <Link
        to={counterpartyUserId ? `/chats/${counterpartyUserId}` : '/chats'}
        className="text-sage-700 hover:text-sage-900 text-sm"
      >
        ← Back to chat
      </Link>

      <div className="mt-4 rounded-3xl border border-cream-200 bg-cream-50 p-5 md:p-7 shadow-soft">
        <p className="hand text-sage-700 text-xl">leave a review</p>
        <h1 className="serif text-3xl text-sage-900 leading-tight mt-1 mb-2">
          {conv ? `Review ${conv.counterpartyDisplayName}` : 'Review'}
        </h1>
        <p className="text-ink-500 text-sm">
          What you write here will be public to other {me?.role === 'EMPLOYER' ? 'employers' : 'helpers'}.
        </p>

        {/* rating */}
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide text-ink-500 mb-2">Overall rating</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`w-10 h-10 rounded-2xl text-lg ${
                  n <= rating
                    ? 'bg-clay-500 text-white'
                    : 'bg-white border border-cream-200 text-ink-500 hover:border-sage-400'
                }`}
                aria-label={`Rate ${n} of 5`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="mt-6">
          <label className="block text-xs uppercase tracking-wide text-ink-500 mb-2">
            What stood out?
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder={
              me?.role === 'EMPLOYER'
                ? 'How was their work? What did they do especially well?'
                : 'How was the family? What was working with them like?'
            }
            className="w-full rounded-2xl border border-cream-200 bg-white px-4 py-3 text-sm md:text-base focus:outline-none focus:border-sage-400"
          />
        </div>

        {/* skill breakdown — employer-on-helper only */}
        {showSkillBreakdown && (
          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-ink-500 mb-2">
              Where did they shine? (100 points)
            </div>
            <div className="space-y-2">
              {SKILL_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-ink-700">{SKILL_LABELS[k]}</div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={breakdown[k]}
                    onChange={(e) => adjustSkill(k, Number(e.target.value))}
                    className="flex-1"
                  />
                  <div className="w-10 text-right text-sm tabular-nums text-ink-700">{breakdown[k]}</div>
                </div>
              ))}
            </div>
            <div
              className={`mt-2 text-xs tabular-nums ${
                breakdownValid ? 'text-sage-700' : 'text-clay-600'
              }`}
            >
              {breakdownValid
                ? 'Adds up to 100 ✓'
                : `Currently ${breakdownTotal} — needs to total 100`}
            </div>
          </div>
        )}

        {/* flag tags */}
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide text-ink-500 mb-2">Tags</div>
          <div className="flex flex-wrap gap-1.5">
            {FLAG_TAGS.map((tag) => {
              const active = flagTags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleFlag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    active
                      ? 'bg-sage-500 text-white border-sage-500'
                      : 'bg-white text-ink-700 border-cream-200 hover:border-sage-400'
                  }`}
                >
                  {FLAG_TAG_LABELS[tag] ?? tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* english level + months — only meaningful EMPLOYER → HELPER */}
        {showSkillBreakdown && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-ink-500 mb-2">
                English level
              </label>
              <select
                value={englishLevel}
                onChange={(e) => setEnglishLevel(e.target.value as EnglishLevel | '')}
                className="w-full rounded-2xl border border-cream-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-sage-400"
              >
                <option value="">Skip</option>
                {ENGLISH_LEVELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-ink-500 mb-2">
                Months into the contract
              </label>
              <input
                type="number"
                min={0}
                max={36}
                value={monthsIn}
                onChange={(e) => setMonthsIn(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 6"
                className="w-full rounded-2xl border border-cream-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-sage-400"
              />
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-clay-600">{error}</p>}

        <div className="mt-6 pt-5 border-t border-cream-200 flex justify-end gap-3">
          <Link
            to={counterpartyUserId ? `/chats/${counterpartyUserId}` : '/chats'}
            className="px-5 py-2.5 rounded-full border border-cream-200 text-ink-700 hover:border-sage-400"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || (showSkillBreakdown && !breakdownValid)}
            className="px-6 py-2.5 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600 disabled:opacity-60"
          >
            {submitting ? 'Posting…' : 'Post review'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 md:px-6 py-20 text-center text-ink-700">{children}</div>
  );
}
