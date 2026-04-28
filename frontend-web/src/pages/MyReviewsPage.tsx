import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { asMessage } from '../lib/api';
import {
  fetchMyReceivedReviews,
  FLAG_TAG_LABELS,
  type ReviewView,
} from '../lib/reviews';

const SKILL_LABELS: Record<string, string> = {
  infant: 'Infant care',
  elderly: 'Elderly care',
  cooking: 'Cooking',
  house: 'Housekeeping',
  attitude: 'Attitude',
};

/**
 * "My reviews" — public reviews other users have written about the calling user.
 * For helpers this is what their potential employers will see; for employers
 * it's what helpers see when deciding whether to engage.
 */
export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<ReviewView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchMyReceivedReviews();
        if (!cancelled) setReviews(r);
      } catch (err) {
        if (!cancelled) setError(asMessage(err, 'Could not load your reviews.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <Centered>{error}</Centered>;
  if (reviews === null) return <Centered>Loading…</Centered>;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="hand text-sage-700 text-xl">trust signals</p>
      <h1 className="serif text-3xl md:text-4xl text-sage-900 leading-tight mt-1 mb-6">
        Reviews about you
      </h1>

      {reviews.length === 0 ? (
        <div className="rounded-3xl border border-cream-200 bg-cream-50 p-8 md:p-10 text-center">
          <p className="text-ink-700 mb-3">No reviews yet.</p>
          <p className="text-ink-500 text-sm">
            Reviews appear here after a contract is active and the other side has written one.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <ReviewCard r={r} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 text-center">
        <Link to="/profile" className="text-sage-700 hover:text-sage-900 text-sm">
          ← Back to profile
        </Link>
      </div>
    </div>
  );
}

function ReviewCard({ r }: { r: ReviewView }) {
  return (
    <article className="rounded-3xl border border-cream-200 bg-cream-50 p-5">
      <header className="flex items-start gap-3">
        <Avatar src={r.reviewerPhotoUrl} fallback={r.reviewerName} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-ink-900 truncate">{r.reviewerName}</div>
          <div className="text-xs text-ink-500">
            {formatDate(r.createdAt)}
            {r.monthsIntoContract != null && ` · ${r.monthsIntoContract} months in`}
          </div>
        </div>
        <Stars n={r.rating} />
      </header>

      {r.body && (
        <p className="mt-3 text-sm md:text-base text-ink-700 leading-relaxed whitespace-pre-line">
          {r.body}
        </p>
      )}

      {r.flagTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {r.flagTags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full text-xs bg-sage-50 text-sage-900 border border-sage-400/30"
            >
              {FLAG_TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>
      )}

      {r.skillBreakdown && (
        <div className="mt-4 pt-4 border-t border-cream-200 grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(r.skillBreakdown).map(([k, v]) => (
            <div key={k} className="text-center">
              <div className="text-xs text-ink-500">{SKILL_LABELS[k] ?? k}</div>
              <div className="font-medium text-sage-900 tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <div className="text-clay-500 tabular-nums shrink-0" aria-label={`${n} of 5 stars`}>
      {'★'.repeat(Math.max(0, Math.min(5, n)))}
      <span className="text-cream-200">{'★'.repeat(5 - Math.max(0, Math.min(5, n)))}</span>
    </div>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-10 h-10 rounded-2xl object-cover bg-cream-200 flex-shrink-0"
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
    <div className="w-10 h-10 rounded-2xl bg-sage-50 text-sage-900 flex items-center justify-center font-medium text-sm flex-shrink-0">
      {initials || '·'}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 md:px-6 py-20 text-center text-ink-700">{children}</div>
  );
}
