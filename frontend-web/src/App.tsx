import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HealthPage from './pages/HealthPage';
import ProfilePage from './pages/ProfilePage';
import MatchesPage from './pages/MatchesPage';
import MatchDetailPage from './pages/MatchDetailPage';
import ChatsPage from './pages/ChatsPage';
import MyReviewsPage from './pages/MyReviewsPage';
import WriteReviewPage from './pages/WriteReviewPage';
import ManageHelperPage from './pages/ManageHelperPage';
import PricingPage from './pages/PricingPage';
import AdminServicesPage from './pages/AdminServicesPage';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminManagePlacementsPage from './pages/AdminManagePlacementsPage';
import AdminManageHolidaysPage from './pages/AdminManageHolidaysPage';
import ActiveEmploymentPage from './pages/ActiveEmploymentPage';
import { useAuthStore } from './lib/auth';
import { listConversations } from './lib/chat';
import { fetchAdminNotifications, fetchUserNotifications } from './lib/admin';
import { useToastStore } from './lib/toasts';
import { useNotificationStore } from './lib/notificationStore';

/**
 * Top-level routing. Marketing routes (/, /login, /signup) are public; everything
 * else requires a hydrated auth token. We re-fetch /auth/me after rehydration so
 * a stale token doesn't render an authenticated UI for a deleted user.
 */
const CONV_POLL_MS = 10_000;
const NOTIF_POLL_MS = 15_000;

export default function App() {
  const { hydrated, accessToken, fetchMe, user } = useAuthStore();
  const loc = useLocation();
  const { push: pushToast, setTotalUnread } = useToastStore();
  const { setNotifications } = useNotificationStore();
  const prevUnread = useRef<Record<string, number>>({});
  const pathnameRef = useRef(loc.pathname);
  pathnameRef.current = loc.pathname;

  useEffect(() => {
    if (hydrated && accessToken) {
      void fetchMe();
    }
  }, [hydrated, accessToken, fetchMe]);

  // Global conversation polling — updates nav badge and fires toasts when not on /chats.
  // Uses pathnameRef so the interval doesn't restart on every navigation.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    // bootstrapped = true after the first successful fetch so we don't toast
    // for messages that were already unread when the user opened the app.
    let bootstrapped = false;

    const tick = async () => {
      try {
        const convs = await listConversations();
        if (cancelled) return;
        setTotalUnread(convs.reduce((sum, c) => sum + c.unreadCount, 0));
        const onChatsPage = pathnameRef.current.startsWith('/chats');
        convs.forEach((c) => {
          const prev = prevUnread.current[c.id] ?? 0;
          if (bootstrapped && c.unreadCount > prev && !onChatsPage) {
            pushToast(
              `New message from ${c.counterpartyDisplayName}`,
              `/chats/${c.counterpartyUserId}`,
            );
          }
          prevUnread.current[c.id] = c.unreadCount;
        });
        bootstrapped = true;
      } catch (err: unknown) {
        if (
          typeof err === 'object' && err !== null && 'response' in err &&
          (err as { response?: { status?: number } }).response?.status === 401
        ) {
          useAuthStore.getState().signOut();
        }
      }
    };
    tick();
    const h = setInterval(tick, CONV_POLL_MS);
    return () => { cancelled = true; clearInterval(h); };
  }, [accessToken, pushToast, setTotalUnread]);

  // User notification polling (employer / helper) — fires a toast for PLACEMENT_ACTIVE
  useEffect(() => {
    if (!accessToken || user?.role === 'ADMIN') return;
    let cancelled = false;
    let prevUnreadCount = 0;
    let bootstrapped = false;

    const tick = async () => {
      try {
        const items = await fetchUserNotifications();
        if (cancelled) return;
        setNotifications(items);
        const unread = items.filter((n) => !n.readAt).length;
        if (bootstrapped && unread > prevUnreadCount) {
          const newest = items.find((n) => !n.readAt);
          if (newest?.type === 'PLACEMENT_ACTIVE') {
            pushToast('Your hiring is now active! View My Employment.', '/employment');
          }
        }
        prevUnreadCount = unread;
        bootstrapped = true;
      } catch { /* ignore */ }
    };
    tick();
    const h = setInterval(tick, NOTIF_POLL_MS);
    return () => { cancelled = true; clearInterval(h); };
  }, [accessToken, user?.role, pushToast, setNotifications]);

  // Admin notification polling — fires a toast when new unread notifications arrive
  useEffect(() => {
    if (!accessToken || user?.role !== 'ADMIN') return;
    let cancelled = false;
    let prevUnreadCount = 0;
    let bootstrapped = false;

    const tick = async () => {
      try {
        const items = await fetchAdminNotifications();
        if (cancelled) return;
        setNotifications(items);
        const unread = items.filter((n) => !n.readAt).length;
        if (bootstrapped && unread > prevUnreadCount) {
          pushToast('Documents ready for review — both parties have submitted.', '/admin/placements');
        }
        prevUnreadCount = unread;
        bootstrapped = true;
      } catch {
        // silently ignore
      }
    };
    tick();
    const h = setInterval(tick, NOTIF_POLL_MS);
    return () => { cancelled = true; clearInterval(h); };
  }, [accessToken, user?.role, pushToast, setNotifications]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Authenticated app routes. */}
        <Route path="/matches" element={<RequireAuth><MatchesPage /></RequireAuth>} />
        <Route path="/matches/:id" element={<RequireAuth><MatchDetailPage /></RequireAuth>} />
        <Route path="/chats" element={<RequireAuth><ChatsPage /></RequireAuth>} />
        <Route path="/chats/:id" element={<RequireAuth><ChatsPage /></RequireAuth>} />
        <Route path="/reviews/me" element={<RequireAuth><MyReviewsPage /></RequireAuth>} />
        <Route path="/reviews/write/:id" element={<RequireAuth><WriteReviewPage /></RequireAuth>} />
        <Route path="/manage" element={<RequireAuth><ManageHelperPage /></RequireAuth>} />
        <Route path="/employment" element={<RequireAuth><ActiveEmploymentPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/admin/services" element={<RequireAdmin><AdminServicesPage /></RequireAdmin>} />
        <Route path="/admin/overview" element={<RequireAdmin><AdminOverviewPage /></RequireAdmin>} />
        <Route path="/admin/placements" element={<RequireAdmin><AdminManagePlacementsPage /></RequireAdmin>} />
        <Route path="/admin/holidays" element={<RequireAdmin><AdminManageHolidaysPage /></RequireAdmin>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { hydrated, accessToken } = useAuthStore();
  const loc = useLocation();

  // Wait for zustand persist to rehydrate so we don't bounce a logged-in user.
  if (!hydrated) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 text-center text-ink-500">
        Loading…
      </div>
    );
  }
  if (!accessToken) {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { hydrated, accessToken, user } = useAuthStore();
  const loc = useLocation();

  if (!hydrated) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 text-center text-ink-500">
        Loading…
      </div>
    );
  }
  if (!accessToken) {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/matches" replace />;
  }
  return <>{children}</>;
}

function PublicHome() {
  const { hydrated, accessToken, user } = useAuthStore();
  if (hydrated && accessToken) {
    return <Navigate to={user?.role === 'ADMIN' ? '/admin/overview' : '/matches'} replace />;
  }
  return <LandingPage />;
}

function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
      <div className="serif text-6xl md:text-7xl text-sage-700 mb-4">404</div>
      <p className="text-ink-500">That page doesn't exist (yet).</p>
    </div>
  );
}
