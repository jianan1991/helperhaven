import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HelperHavenWordmark } from './Logo';
import { useAuthStore } from '../lib/auth';
import { useToastStore } from '../lib/toasts';
import { useNotificationStore } from '../lib/notificationStore';
import { markAllNotificationsRead, markAllUserNotificationsRead } from '../lib/admin';
import ToastStack from './ToastStack';

/**
 * Top-level app shell. Responsive nav: full menu on md+, hamburger drawer on mobile.
 * Used by every authenticated page; the public landing renders its own hero nav.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, signOut } = useAuthStore();
  const loc = useLocation();
  const nav = useNavigate();
  const totalUnread = useToastStore((s) => s.totalUnread);
  const { notifications, unreadCount, setNotifications } = useNotificationStore();

  async function handleBellClick() {
    setNotifOpen((o) => !o);
    if (!notifOpen && unreadCount > 0) {
      try {
        if (user?.role === 'ADMIN') {
          await markAllNotificationsRead();
        } else {
          await markAllUserNotificationsRead();
        }
        setNotifications(notifications.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      } catch { /* ignore */ }
    }
  }

  function goToPlacement() {
    setNotifOpen(false);
    if (user?.role === 'ADMIN') {
      nav('/admin/placements');
    } else {
      nav('/employment');
    }
  }

  // Public marketing pages get the layout's brand bar but no app nav links.
  const isMarketing = ['/', '/login', '/signup'].includes(loc.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      <header className="sticky top-0 z-40 bg-cream-100/85 backdrop-blur border-b border-cream-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <Link to="/" className="shrink-0">
            <HelperHavenWordmark size="md" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm text-ink-700">
            {isMarketing ? (
              <>
                <a href="#how" className="hover:text-sage-700">How it works</a>
                <a href="#families" className="hover:text-sage-700">For families</a>
                <a href="#helpers" className="hover:text-sage-700">For helpers</a>
                <a href="#permit" className="hover:text-sage-700">Work permit</a>
              </>
            ) : (
              <>
                {user?.role !== 'ADMIN' && (
                  <NavLink to="/matches" className={navLinkCls}>Matches</NavLink>
                )}
                {user?.role !== 'ADMIN' && (
                  <NavLink to="/chats" className={navLinkCls}>
                    {({ isActive }) => (
                      <span className="relative">
                        Chats
                        {totalUnread > 0 && !isActive && (
                          <span className="absolute -top-2 -right-3 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-clay-500 text-white text-[9px] font-bold px-1">
                            {totalUnread > 9 ? '9+' : totalUnread}
                          </span>
                        )}
                      </span>
                    )}
                  </NavLink>
                )}
                {user?.role !== 'ADMIN' && (
                  <NavLink to="/manage" className={navLinkCls}>My Hiring</NavLink>
                )}
                {user?.role !== 'ADMIN' && (
                  <NavLink to="/employment" className={navLinkCls}>Active Employment</NavLink>
                )}
                <NavLink to="/profile" className={navLinkCls}>My profile</NavLink>
                {user?.role !== 'ADMIN' && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => void handleBellClick()}
                      className="relative p-1.5 rounded-full hover:bg-cream-200 transition-colors"
                      aria-label="Notifications"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-700">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-clay-500 text-white text-[9px] font-bold px-1">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    {notifOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-cream-200 shadow-lg z-50 overflow-hidden">
                          <div className="px-4 py-3 border-b border-cream-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-ink-900">Notifications</span>
                            {notifications.length > 0 && (
                              <button
                                className="text-xs text-sage-700 hover:text-sage-900"
                                onClick={() => void goToPlacement()}
                              >
                                View employment →
                              </button>
                            )}
                          </div>
                          {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-xs text-ink-400 text-center">No notifications yet.</div>
                          ) : (
                            <div className="divide-y divide-cream-100 max-h-72 overflow-y-auto">
                              {notifications.slice(0, 10).map((n) => (
                                <button
                                  key={n.id}
                                  type="button"
                                  onClick={() => void goToPlacement()}
                                  className={`w-full text-left px-4 py-3 hover:bg-cream-50 transition-colors ${!n.readAt ? 'bg-sage-50/60' : ''}`}
                                >
                                  <div className="flex items-start gap-2">
                                    {!n.readAt && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-clay-500 shrink-0" />}
                                    <div className={!n.readAt ? '' : 'pl-3.5'}>
                                      <p className="text-xs font-semibold text-ink-900">{n.title}</p>
                                      {n.body && <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">{n.body}</p>}
                                      <p className="text-[10px] text-ink-400 mt-1">{relTime(n.createdAt)}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {user?.role === 'ADMIN' && (
                  <>
                    <NavLink to="/admin/overview" className={navLinkCls}>Overview</NavLink>
                    <NavLink to="/admin/placements" className={navLinkCls}>Hirings</NavLink>
                    <NavLink to="/admin/services" className={navLinkCls}>Services</NavLink>
                    <NavLink to="/admin/holidays" className={navLinkCls}>Manage Holidays</NavLink>
                    {/* Notification bell */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => void handleBellClick()}
                        className="relative p-1.5 rounded-full hover:bg-cream-200 transition-colors"
                        aria-label="Notifications"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-700">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-clay-500 text-white text-[9px] font-bold px-1">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>
                      {notifOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-cream-200 shadow-lg z-50 overflow-hidden">
                            <div className="px-4 py-3 border-b border-cream-100 flex items-center justify-between">
                              <span className="text-sm font-semibold text-ink-900">Notifications</span>
                              {notifications.length > 0 && (
                                <button
                                  className="text-xs text-sage-700 hover:text-sage-900"
                                  onClick={() => void goToPlacement()}
                                >
                                  View hirings →
                                </button>
                              )}
                            </div>
                            {notifications.length === 0 ? (
                              <div className="px-4 py-6 text-xs text-ink-400 text-center">No notifications yet.</div>
                            ) : (
                              <div className="divide-y divide-cream-100 max-h-72 overflow-y-auto">
                                {notifications.slice(0, 10).map((n) => (
                                  <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => void goToPlacement()}
                                    className={`w-full text-left px-4 py-3 hover:bg-cream-50 transition-colors ${!n.readAt ? 'bg-sage-50/60' : ''}`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {!n.readAt && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-clay-500 shrink-0" />}
                                      <div className={!n.readAt ? '' : 'pl-3.5'}>
                                        <p className="text-xs font-semibold text-ink-900">{n.title}</p>
                                        {n.body && <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">{n.body}</p>}
                                        <p className="text-[10px] text-ink-400 mt-1">{relTime(n.createdAt)}</p>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Auth actions, desktop */}
          <div className="hidden md:flex gap-2 items-center">
            {user ? (
              <>
                <span className="text-sm text-ink-500">{user.email}</span>
                <button
                  onClick={signOut}
                  className="px-4 py-2 rounded-full text-sage-700 hover:bg-sage-50 text-sm"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-sage-700 hover:bg-sage-50 text-sm"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-full bg-clay-500 text-white hover:bg-clay-600 font-medium text-sm"
                >
                  Say hello →
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 -mr-2 rounded-lg hover:bg-cream-200"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-ink-900">
              {open ? (
                <path d="M6 6l12 12M6 18L18 6" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M4 7h16" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 12h16" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 17h16" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden border-t border-cream-200 bg-cream-50">
            <nav className="px-4 py-4 flex flex-col gap-1 text-base">
              {isMarketing ? (
                <>
                  <a href="#how" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">How it works</a>
                  <a href="#families" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">For families</a>
                  <a href="#helpers" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">For helpers</a>
                  <a href="#permit" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">Work permit</a>
                </>
              ) : (
                <>
                  {user?.role !== 'ADMIN' && (
                    <NavLink to="/matches" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">Matches</NavLink>
                  )}
                  {user?.role !== 'ADMIN' && (
                    <NavLink to="/chats" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200 flex items-center gap-2">
                      Chats
                      {totalUnread > 0 && (
                        <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-clay-500 text-white text-[9px] font-bold px-1">
                          {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                      )}
                    </NavLink>
                  )}
                  {user?.role !== 'ADMIN' && (
                    <NavLink to="/manage" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">My Hiring</NavLink>
                  )}
                  {user?.role !== 'ADMIN' && (
                    <NavLink to="/employment" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200 flex items-center gap-2">
                      Active Employment
                      {unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-clay-500 text-white text-[9px] font-bold px-1">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </NavLink>
                  )}
                  <NavLink to="/profile" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">My profile</NavLink>
                  {user?.role === 'ADMIN' && (
                    <>
                      <NavLink to="/admin/overview" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">Overview</NavLink>
                      <NavLink to="/admin/holidays" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">Manage Holidays</NavLink>
                      <NavLink to="/admin/placements" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200 flex items-center gap-2">
                        Hirings
                        {unreadCount > 0 && (
                          <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-clay-500 text-white text-[9px] font-bold px-1">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </NavLink>
                      <NavLink to="/admin/services" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">Services</NavLink>
                    </>
                  )}
                </>
              )}
              <div className="border-t border-cream-200 mt-2 pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    <span className="text-sm text-ink-500 px-2">{user.email}</span>
                    <button
                      onClick={() => { signOut(); setOpen(false); }}
                      className="text-left py-3 px-2 rounded-lg text-sage-700 hover:bg-sage-50"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="py-3 px-2 rounded-lg text-sage-700 hover:bg-sage-50"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setOpen(false)}
                      className="text-center py-3 px-4 rounded-full bg-clay-500 text-white hover:bg-clay-600 font-medium"
                    >
                      Say hello →
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 w-full">{children}</main>
      <ToastStack />

      <footer className="border-t border-cream-200 bg-cream-50 mt-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-sm">
          <div className="col-span-2 md:col-span-1">
            <HelperHavenWordmark size="sm" />
            <p className="mt-3 text-ink-500 text-xs leading-relaxed">
              Bridging Singapore families and the helpers who'll share their home — without the agency markup.
            </p>
          </div>
          <FooterCol
            heading="Product"
            links={[
              ['How it works', '#how'],
              ['For families', '#families'],
              ['For helpers', '#helpers'],
              ['Work permit', '#permit'],
            ]}
          />
          <FooterCol
            heading="Company"
            links={[
              ['About', '/about'],
              ['Pricing', '/pricing'],
              ['Contact', '/contact'],
            ]}
          />
          <FooterCol
            heading="Legal"
            links={[
              ['Privacy', '/privacy'],
              ['Terms', '/terms'],
              ['Refund policy', '/refunds'],
            ]}
          />
        </div>
        <div className="border-t border-cream-200">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 text-xs text-ink-500 flex flex-col md:flex-row justify-between gap-2">
            <span>© {new Date().getFullYear()} HelperHaven · Singapore</span>
            <span>MOM EA Licence · synthetic dev seed only · UTC timestamps</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ heading, links }: { heading: string; links: [string, string][] }) {
  return (
    <div>
      <div className="font-medium text-ink-900 mb-2 text-xs uppercase tracking-wide">{heading}</div>
      <ul className="space-y-1.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <a href={href} className="text-ink-500 hover:text-sage-700">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function navLinkCls({ isActive }: { isActive: boolean }) {
  return `hover:text-sage-700 ${isActive ? 'text-sage-700 font-medium' : ''}`;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  if (diff < min)  return 'just now';
  if (diff < hr)   return `${Math.floor(diff / min)}m ago`;
  if (diff < day)  return `${Math.floor(diff / hr)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}
