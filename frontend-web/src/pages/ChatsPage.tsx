import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { asMessage } from '../lib/api';
import { listConversations, type ConversationView } from '../lib/chat';

/**
 * Sidebar-style list of all conversations the current user is a participant in.
 * Tapping a row opens the per-thread view at /chats/{counterpartyUserId} —
 * we use the counterparty's user ID rather than the conversation ID so the
 * route also works when navigating from a match card before any messages exist.
 */
export default function ChatsPage() {
  const [list, setList] = useState<ConversationView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listConversations();
        if (!cancelled) setList(rows);
      } catch (err) {
        if (!cancelled) setError(asMessage(err, 'Could not load conversations.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Centered>
        <p className="text-ink-700">{error}</p>
      </Centered>
    );
  }
  if (list === null) return <Centered>Loading conversations…</Centered>;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-6">
        <p className="hand text-sage-700 text-xl">your inbox</p>
        <h1 className="serif text-3xl md:text-4xl text-sage-900 leading-tight mt-1">
          Conversations
        </h1>
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-cream-200 bg-cream-50 p-8 md:p-10 text-center">
          <p className="text-ink-700 mb-3">No conversations yet.</p>
          <Link to="/matches" className="text-sage-700 hover:text-sage-900">
            Browse matches →
          </Link>
        </div>
      ) : (
        <ul className="grid gap-2 md:gap-3">
          {list.map((c) => (
            <li key={c.id}>
              <ConversationRow c={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationRow({ c }: { c: ConversationView }) {
  return (
    <Link
      to={`/chats/${c.counterpartyUserId}`}
      className="flex items-center gap-4 rounded-3xl border border-cream-200 bg-cream-50 hover:border-sage-400/60 transition-colors p-3 md:p-4"
    >
      <Avatar src={c.counterpartyPhotoUrl} fallback={c.counterpartyDisplayName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-medium text-ink-900 truncate">{c.counterpartyDisplayName}</div>
          <div className="text-xs text-ink-500 shrink-0">{relTime(c.lastMessageAt ?? c.createdAt)}</div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-0.5">
          <p className="text-sm text-ink-700 truncate">
            {c.lastMessagePreview ?? <span className="italic text-ink-500">No messages yet</span>}
          </p>
          {c.unreadCount > 0 && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-clay-500 text-white text-[11px] font-medium tabular-nums">
              {c.unreadCount > 99 ? '99+' : c.unreadCount}
            </span>
          )}
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
        className="w-12 h-12 md:w-14 md:h-14 rounded-2xl object-cover bg-cream-200 flex-shrink-0"
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
    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-sage-50 text-sage-900 flex items-center justify-center font-medium text-sm flex-shrink-0">
      {initials || '·'}
    </div>
  );
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m`;
  if (diff < day) return `${Math.floor(diff / hr)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  return new Date(iso).toLocaleDateString();
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 md:px-6 py-20 text-center text-ink-700">{children}</div>
  );
}
