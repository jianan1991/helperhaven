import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { asMessage } from '../lib/api';
import { useAuthStore } from '../lib/auth';
import {
  listMessages,
  markRead,
  openChat,
  sendMessage,
  type ConversationView,
  type MessageView,
} from '../lib/chat';
import { demoMarkHired, getPermitWith, type PermitCaseView } from '../lib/reviews';

const POLL_INTERVAL_MS = 3000;

/**
 * Per-thread chat view. The URL carries the counterparty's user ID rather than
 * the conversation ID so navigation from a match card works even before the
 * row exists — `openChat` is idempotent and creates on first call.
 *
 * Polling: a setInterval that asks for "messages since the last sentAt I have".
 * Sprint A doesn't ship websockets; 3-second polling is more than fine for a
 * two-browser demo and trivially upgrades when realtime lands.
 */
export default function ChatPage() {
  const { id: counterpartyUserId } = useParams<{ id: string }>();
  const me = useAuthStore((s) => s.user);

  const [conv, setConv] = useState<ConversationView | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // Permit state drives the chat header's "Mark as hired" / "Write review" CTAs.
  // null = no permit case yet, otherwise we have one (and reviewsUnlocked tells
  // us whether status is CARD_ISSUED or later).
  const [permit, setPermit] = useState<PermitCaseView | null>(null);
  const [hiringInFlight, setHiringInFlight] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // Track the last message timestamp we have so the polling query is a delta.
  // Held in a ref so the interval callback always sees the latest value without
  // re-creating the interval on every state update.
  const lastSentAtRef = useRef<string | null>(null);

  // -------- bootstrap: open/find the conversation, then fetch initial messages
  useEffect(() => {
    if (!counterpartyUserId) return;
    let cancelled = false;
    setConv(null);
    setMessages([]);
    setError(null);
    lastSentAtRef.current = null;

    (async () => {
      try {
        const c = await openChat(counterpartyUserId);
        if (cancelled) return;
        setConv(c);
        const initial = await listMessages(c.id);
        if (cancelled) return;
        setMessages(initial);
        if (initial.length > 0) lastSentAtRef.current = initial[initial.length - 1].sentAt;
        // Mark read once on entry so the unread badge clears.
        try {
          await markRead(c.id);
        } catch {
          /* non-fatal */
        }
      } catch (err) {
        if (!cancelled) setError(asMessage(err, 'Could not open this conversation.'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [counterpartyUserId]);

  // -------- bootstrap: load (or note the absence of) a permit case so the
  // header can show "Mark as hired" / "Write review" appropriately.
  useEffect(() => {
    if (!counterpartyUserId) return;
    let cancelled = false;
    setPermit(null);
    (async () => {
      try {
        const pc = await getPermitWith(counterpartyUserId);
        if (!cancelled) setPermit(pc);
      } catch {
        /* non-fatal: header just won't show the CTAs */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [counterpartyUserId]);

  // -------- polling: only runs once the conversation row is known
  useEffect(() => {
    if (!conv) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const since = lastSentAtRef.current;
        const fresh = await listMessages(conv.id, since ?? undefined);
        if (cancelled || fresh.length === 0) return;
        setMessages((prev) => mergeMessages(prev, fresh));
        lastSentAtRef.current = fresh[fresh.length - 1].sentAt;
        // We saw new messages from the counterparty — bump the read cursor.
        if (fresh.some((m) => m.senderUserId !== me?.id)) {
          markRead(conv.id).catch(() => {
            /* non-fatal */
          });
        }
      } catch {
        // Stay silent on transient network errors; the UI keeps showing what it has.
      }
    };
    const handle = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [conv, me?.id]);

  // -------- autoscroll on new messages
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function onMarkHired() {
    if (!counterpartyUserId || hiringInFlight) return;
    setHiringInFlight(true);
    try {
      const pc = await demoMarkHired(counterpartyUserId);
      setPermit(pc);
    } catch (err) {
      setError(asMessage(err, 'Could not fast-forward the permit.'));
    } finally {
      setHiringInFlight(false);
    }
  }

  async function onSend() {
    if (!conv) return;
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      const m = await sendMessage(conv.id, body);
      setMessages((prev) => mergeMessages(prev, [m]));
      lastSentAtRef.current = m.sentAt;
    } catch (err) {
      setError(asMessage(err, 'Could not send message.'));
      setDraft(body); // restore so the user doesn't lose what they typed
    } finally {
      setSending(false);
    }
  }

  if (error && !conv) {
    return (
      <Centered>
        <p className="text-ink-700 mb-4">{error}</p>
        <Link to="/chats" className="text-sage-700 hover:text-sage-900">← Back to inbox</Link>
      </Centered>
    );
  }
  if (!conv) return <Centered>Opening conversation…</Centered>;

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-6 py-4 md:py-8 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* header */}
      <div className="flex items-center gap-3 mb-3 md:mb-4">
        <Link to="/chats" className="text-sage-700 hover:text-sage-900 text-sm shrink-0">
          ← Inbox
        </Link>
        <Avatar src={conv.counterpartyPhotoUrl} fallback={conv.counterpartyDisplayName} />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-ink-900 truncate">{conv.counterpartyDisplayName}</div>
          <div className="text-xs text-ink-500">Chat is end-to-end on the demo backend.</div>
        </div>
        {/* Permit-driven CTAs. The demo concierge fast-forward stays employer-only;
            the review link unlocks for either side once status >= CARD_ISSUED. */}
        {permit?.reviewsUnlocked ? (
          <Link
            to={`/reviews/write/${counterpartyUserId}`}
            className="shrink-0 px-3.5 py-1.5 rounded-full bg-sage-500 text-white text-xs md:text-sm hover:bg-sage-700"
          >
            Write review →
          </Link>
        ) : (
          me?.role === 'EMPLOYER' && (
            <button
              type="button"
              onClick={() => void onMarkHired()}
              disabled={hiringInFlight}
              className="shrink-0 px-3.5 py-1.5 rounded-full border border-cream-200 text-ink-700 text-xs md:text-sm hover:border-sage-400 disabled:opacity-60"
              title="Demo only: jump the permit case straight to CARD_ISSUED so reviews unlock."
            >
              {hiringInFlight ? 'Marking…' : 'Mark as hired (demo)'}
            </button>
          )
        )}
      </div>

      {/* thread */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto rounded-3xl border border-cream-200 bg-cream-50 p-4 md:p-5"
      >
        {messages.length === 0 ? (
          <div className="text-center text-ink-500 text-sm py-10">
            Say hello — your message starts the conversation.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <li key={m.id}>
                <Bubble msg={m} mine={m.senderUserId === me?.id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* composer */}
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void onSend();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
          placeholder="Write a message…"
          rows={1}
          maxLength={4000}
          className="flex-1 resize-none rounded-2xl border border-cream-200 bg-white px-4 py-2.5 text-sm md:text-base focus:outline-none focus:border-sage-400"
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          className="px-5 py-2.5 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600 disabled:opacity-60"
        >
          Send
        </button>
      </form>
      {error && conv && (
        <p className="text-xs text-clay-600 mt-2">{error}</p>
      )}
    </div>
  );
}

function Bubble({ msg, mine }: { msg: MessageView; mine: boolean }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm md:text-base whitespace-pre-wrap break-words ${
          mine
            ? 'bg-sage-500 text-white rounded-br-md'
            : 'bg-white border border-cream-200 text-ink-900 rounded-bl-md'
        }`}
      >
        <div>{msg.body}</div>
        <div className={`text-[10px] mt-1 tabular-nums ${mine ? 'text-sage-50/80' : 'text-ink-500'}`}>
          {formatTime(msg.sentAt)}
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

/**
 * De-duplicate by id while preserving order. The polling endpoint uses a strict
 * `> since` filter, so collisions are rare — but just-sent local writes plus a
 * concurrent poll can create one, and we'd rather drop the dup than render twice.
 */
function mergeMessages(prev: MessageView[], incoming: MessageView[]): MessageView[] {
  if (incoming.length === 0) return prev;
  const seen = new Set(prev.map((m) => m.id));
  const additions = incoming.filter((m) => !seen.has(m.id));
  if (additions.length === 0) return prev;
  return [...prev, ...additions];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 md:px-6 py-20 text-center text-ink-700">{children}</div>
  );
}
