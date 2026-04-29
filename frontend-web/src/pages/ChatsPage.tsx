import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { asMessage } from '../lib/api';
import { useAuthStore } from '../lib/auth';
import {
  listConversations,
  listMessages,
  markRead,
  openChat,
  sendMessage,
  type ConversationView,
  type MessageView,
} from '../lib/chat';
import { demoMarkHired, getPermitWith, type PermitCaseView } from '../lib/reviews';
import { fetchWallet } from '../lib/wallet';

const POLL_MS = 3000;
const REFUND_WINDOW_MS = 48 * 60 * 60 * 1000;

export default function ChatsPage() {
  const { id: activeId } = useParams<{ id?: string }>();
  const nav = useNavigate();
  const me = useAuthStore((s) => s.user);

  // Conversation list
  const [convs, setConvs] = useState<ConversationView[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  // Active thread
  const [activeConv, setActiveConv] = useState<ConversationView | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [permit, setPermit] = useState<PermitCaseView | null>(null);
  const [hiringInFlight, setHiringInFlight] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lastSentAtRef = useRef<string | null>(null);

  // Load conversation list
  useEffect(() => {
    let cancelled = false;
    listConversations()
      .then((list) => { if (!cancelled) setConvs(list); })
      .catch(() => { if (!cancelled) setConvs([]); });
    return () => { cancelled = true; };
  }, []);

  // Wallet balance (employers only)
  useEffect(() => {
    if (me?.role !== 'EMPLOYER') return;
    let cancelled = false;
    fetchWallet().then((w) => { if (!cancelled) setBalance(w.balance); }).catch(() => {});
    return () => { cancelled = true; };
  }, [me?.role]);

  // Open active thread when URL changes
  useEffect(() => {
    if (!activeId) { setActiveConv(null); setMessages([]); return; }
    let cancelled = false;
    setActiveConv(null); setMessages([]); setThreadError(null); lastSentAtRef.current = null;
    (async () => {
      try {
        const c = await openChat(activeId);
        if (cancelled) return;
        setActiveConv(c);
        const init = await listMessages(c.id);
        if (cancelled) return;
        setMessages(init);
        if (init.length) lastSentAtRef.current = init[init.length - 1].sentAt;
        markRead(c.id).catch(() => {});
      } catch (err) {
        if (!cancelled) setThreadError(asMessage(err, 'Could not open conversation.'));
      }
    })();
    return () => { cancelled = true; };
  }, [activeId]);

  // Permit case for the active thread
  useEffect(() => {
    if (!activeId) { setPermit(null); return; }
    let cancelled = false;
    getPermitWith(activeId).then((pc) => { if (!cancelled) setPermit(pc); }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeId]);

  // Poll for new messages
  useEffect(() => {
    if (!activeConv) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const fresh = await listMessages(activeConv.id, lastSentAtRef.current ?? undefined);
        if (cancelled || !fresh.length) return;
        setMessages((prev) => mergeMessages(prev, fresh));
        lastSentAtRef.current = fresh[fresh.length - 1].sentAt;
        if (fresh.some((m) => m.senderUserId !== me?.id)) {
          markRead(activeConv.id).catch(() => {});
          setConvs((prev) =>
            prev?.map((c) =>
              c.id === activeConv.id
                ? { ...c, unreadCount: 0, lastMessagePreview: fresh[fresh.length - 1].body, lastMessageAt: fresh[fresh.length - 1].sentAt }
                : c
            ) ?? prev
          );
        }
      } catch { /* stay silent on transient errors */ }
    };
    const h = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(h); };
  }, [activeConv, me?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length]);

  async function onSend() {
    if (!activeConv || !draft.trim() || sending) return;
    const body = draft.trim();
    setSending(true); setDraft('');
    try {
      const m = await sendMessage(activeConv.id, body);
      setMessages((prev) => mergeMessages(prev, [m]));
      lastSentAtRef.current = m.sentAt;
      setConvs((prev) =>
        prev?.map((c) =>
          c.id === activeConv.id
            ? { ...c, lastMessagePreview: body, lastMessageAt: m.sentAt }
            : c
        ) ?? prev
      );
    } catch (err) {
      setThreadError(asMessage(err, 'Could not send message.'));
      setDraft(body);
    } finally { setSending(false); }
  }

  async function onMarkHired() {
    if (!activeId || hiringInFlight) return;
    setHiringInFlight(true);
    try { setPermit(await demoMarkHired(activeId)); }
    catch (err) { setThreadError(asMessage(err, 'Could not mark as hired.')); }
    finally { setHiringInFlight(false); }
  }

  const isRefundEligible = (c: ConversationView) =>
    !c.lastMessagePreview && Date.now() - new Date(c.createdAt).getTime() > REFUND_WINDOW_MS;

  const hoursSince = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));

  const activeCount = convs?.filter((c) => !isRefundEligible(c)).length ?? 0;
  const refundCount = convs?.filter(isRefundEligible).length ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-sage-700">
            {me?.role === 'EMPLOYER' ? 'Employer · chat' : 'Helper · chat'}
          </div>
          <h1 className="serif text-4xl font-bold text-ink-900 mt-2">Your conversations</h1>
          <p className="mt-2 text-ink-500 text-sm max-w-xl">
            Names &amp; contact details stay hidden until you both agree to share.
          </p>
        </div>
        {me?.role === 'EMPLOYER' && (
          <div className="flex items-center gap-3 text-sm shrink-0">
            {balance !== null && (
              <div className="rounded-full bg-white border border-cream-200 px-4 py-2 text-ink-900">
                🪙 <span className="font-semibold">{balance}</span> credit{balance === 1 ? '' : 's'} left
              </div>
            )}
            <Link
              to="/profile"
              className="rounded-full bg-sage-900 text-cream-100 px-4 py-2 hover:bg-sage-700 transition-colors"
            >
              Top up
            </Link>
          </div>
        )}
      </div>

      {/* Split panel */}
      <div className="grid md:grid-cols-[340px_1fr] gap-5 items-start" style={{ minHeight: 620 }}>

        {/* ── Thread list sidebar ── */}
        <aside className={`rounded-3xl bg-white border border-cream-200 p-3 space-y-2 ${activeId ? 'hidden md:block' : 'block'}`}
          style={{ maxHeight: 620, overflowY: 'auto' }}>
          {convs === null ? (
            <div className="px-3 py-10 text-center text-ink-500 text-sm">Loading…</div>
          ) : convs.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-sm text-ink-700 mb-3">No conversations yet.</p>
              <Link to="/matches" className="text-xs text-sage-700 hover:text-sage-900 font-medium">
                Browse matches →
              </Link>
            </div>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-widest text-ink-500 px-3 py-2 flex items-center justify-between">
                <span>{activeCount} active</span>
                {refundCount > 0 && (
                  <span className="text-clay-600 font-semibold">{refundCount} refund-eligible</span>
                )}
              </div>

              {convs.map((c) => {
                const isActive = c.counterpartyUserId === activeId;
                const isRefund = isRefundEligible(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => nav(`/chats/${c.counterpartyUserId}`)}
                    className={`w-full text-left rounded-2xl p-3 transition-colors ${
                      isActive
                        ? 'bg-sage-50 border-2 border-sage-500'
                        : 'bg-white border border-cream-200 hover:border-sage-400/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ThreadAvatar src={c.counterpartyPhotoUrl} name={c.counterpartyDisplayName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="serif font-bold truncate text-ink-900 text-sm">
                            {c.counterpartyDisplayName}
                          </span>
                          {c.unreadCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-clay-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-ink-500 truncate mt-0.5">
                          {c.lastMessagePreview
                            ? `"${c.lastMessagePreview}"`
                            : '— no reply yet —'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      {isRefund ? (
                        <>
                          <span className="text-[10px] bg-clay-500/10 text-clay-600 px-2 py-0.5 rounded-full font-semibold uppercase tracking-widest">
                            ↻ Refund eligible
                          </span>
                          <span className="text-[10px] text-ink-500">
                            {hoursSince(c.createdAt)}h since unlock
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] text-sage-700 font-semibold uppercase tracking-widest">
                            {c.lastMessageAt
                              ? `· ${relTime(c.lastMessageAt)}`
                              : '· Just opened'}
                          </span>
                          {c.unreadCount > 0 && (
                            <span className="bg-clay-500 text-white px-1.5 rounded-full font-semibold text-[10px]">
                              {c.unreadCount}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}

              <div className="pt-3 border-t border-cream-200 px-3">
                <Link
                  to="/matches"
                  className="text-xs text-sage-700 hover:text-sage-900 font-medium"
                >
                  + Start a new chat from Matches
                </Link>
              </div>
            </>
          )}
        </aside>

        {/* ── Thread pane ── */}
        {!activeId ? (
          <div className="hidden md:flex rounded-3xl bg-white border border-cream-200 items-center justify-center" style={{ height: 620 }}>
            <div className="text-center">
              <p className="text-ink-500 text-sm">Select a conversation to open it.</p>
              <Link to="/matches" className="mt-3 inline-block text-xs text-sage-700 hover:text-sage-900 font-medium">
                Browse matches →
              </Link>
            </div>
          </div>
        ) : threadError && !activeConv ? (
          <div className="flex flex-col rounded-3xl bg-white border border-cream-200 items-center justify-center gap-4 p-8" style={{ height: 620 }}>
            <p className="text-ink-700 text-sm">{threadError}</p>
            <button
              type="button"
              onClick={() => nav('/chats')}
              className="text-sage-700 text-sm hover:text-sage-900"
            >
              ← Back to conversations
            </button>
          </div>
        ) : !activeConv ? (
          <div className="flex rounded-3xl bg-white border border-cream-200 items-center justify-center" style={{ height: 620 }}>
            <p className="text-ink-500 text-sm">Opening conversation…</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white border border-cream-200 flex flex-col overflow-hidden" style={{ height: 620 }}>

            {/* Thread header */}
            <div className="p-4 border-b border-cream-200 flex flex-wrap items-center gap-3 shrink-0">
              {/* Mobile back */}
              <button
                type="button"
                onClick={() => nav('/chats')}
                className="md:hidden text-sage-700 text-sm hover:text-sage-900 shrink-0"
              >
                ←
              </button>
              <ThreadAvatar src={activeConv.counterpartyPhotoUrl} name={activeConv.counterpartyDisplayName} size="md" />
              <div className="min-w-0 flex-1">
                <span className="serif text-lg font-bold text-ink-900">
                  {activeConv.counterpartyDisplayName}
                </span>
                <div className="text-xs text-ink-500 mt-0.5 truncate">
                  Contact details stay hidden until you both agree to share.
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {permit?.reviewsUnlocked ? (
                  <Link
                    to={`/reviews/write/${activeId}`}
                    className="text-xs px-3 py-2 rounded-full bg-sage-900 text-cream-100 hover:bg-sage-700 transition-colors"
                  >
                    Write review →
                  </Link>
                ) : (
                  me?.role === 'EMPLOYER' && (
                    <button
                      type="button"
                      onClick={() => void onMarkHired()}
                      disabled={hiringInFlight}
                      className="text-xs px-3 py-2 rounded-full bg-cream-50 border border-cream-200 hover:border-sage-500 text-ink-700 disabled:opacity-60 transition-colors"
                    >
                      {hiringInFlight ? 'Marking…' : 'Mark as hired (demo)'}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollerRef}
              className="flex-1 p-5 overflow-y-auto space-y-3 bg-cream-50"
            >
              {/* System notice — thread open */}
              <div className="flex justify-center">
                <div className="text-[10px] text-ink-500 bg-white border border-cream-200 px-3 py-1 rounded-full">
                  Thread opened · 🪙 1 credit · Contact hidden until mutual
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="text-center text-ink-500 text-sm py-10">
                  Say hello — your message starts the conversation.
                </div>
              ) : (
                messages.map((m) => (
                  <Bubble key={m.id} msg={m} mine={m.senderUserId === me?.id} />
                ))
              )}

              {/* PII notice below messages */}
              {messages.length > 0 && (
                <div className="flex justify-center pt-1">
                  <div className="text-[10px] text-ink-500 bg-white border border-cream-200 px-3 py-1 rounded-full max-w-xs text-center">
                    🔒 Both sides must agree to share contact details.
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-cream-200 flex gap-3 items-center shrink-0">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void onSend(); }
                }}
                placeholder="Type a message…"
                maxLength={4000}
                className="flex-1 px-4 py-3 rounded-full bg-cream-50 border border-cream-200 focus:outline-none focus:border-sage-500 text-sm"
              />
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={sending || !draft.trim()}
                className="px-5 py-3 rounded-full bg-clay-500 text-white font-medium hover:bg-clay-600 text-sm disabled:opacity-60 transition-colors"
              >
                Send
              </button>
            </div>

            {threadError && (
              <p className="px-4 pb-3 text-xs text-clay-600 shrink-0">{threadError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function Bubble({ msg, mine }: { msg: MessageView; mine: boolean }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : ''}`}>
      <div className="max-w-[75%] space-y-1">
        <div
          className={`px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
            mine
              ? 'rounded-2xl rounded-tr-sm bg-sage-700 text-cream-100'
              : 'rounded-2xl rounded-tl-sm bg-white border border-cream-200 text-ink-900'
          }`}
        >
          {msg.body}
        </div>
        <div className={`text-[10px] text-ink-500 ${mine ? 'text-right' : ''}`}>
          {mine ? 'You · ' : ''}{formatTime(msg.sentAt)}
        </div>
      </div>
    </div>
  );
}

function ThreadAvatar({
  src,
  name,
  size = 'sm',
}: {
  src: string | null;
  name: string;
  size?: 'sm' | 'md';
}) {
  const sz = size === 'md' ? 'w-12 h-12' : 'w-11 h-11';
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (src) {
    return <img src={src} alt="" className={`${sz} rounded-full object-cover bg-cream-200 shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-sage-400 to-sage-700 text-white flex items-center justify-center font-semibold text-sm shrink-0`}>
      {initials || '·'}
    </div>
  );
}

// ── Utilities ──

function mergeMessages(prev: MessageView[], incoming: MessageView[]): MessageView[] {
  const seen = new Set(prev.map((m) => m.id));
  const additions = incoming.filter((m) => !seen.has(m.id));
  return additions.length ? [...prev, ...additions] : prev;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
