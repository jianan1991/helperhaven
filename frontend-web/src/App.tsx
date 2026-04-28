import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HealthPage from './pages/HealthPage';
import ProfilePage from './pages/ProfilePage';
import MatchesPage from './pages/MatchesPage';
import MatchDetailPage from './pages/MatchDetailPage';
import ChatsPage from './pages/ChatsPage';
import ChatPage from './pages/ChatPage';
import MyReviewsPage from './pages/MyReviewsPage';
import WriteReviewPage from './pages/WriteReviewPage';
import { useAuthStore } from './lib/auth';

/**
 * Top-level routing. Marketing routes (/, /login, /signup) are public; everything
 * else requires a hydrated auth token. We re-fetch /auth/me after rehydration so
 * a stale token doesn't render an authenticated UI for a deleted user.
 */
export default function App() {
  const { hydrated, accessToken, fetchMe } = useAuthStore();

  useEffect(() => {
    if (hydrated && accessToken) {
      void fetchMe();
    }
  }, [hydrated, accessToken, fetchMe]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/health" element={<HealthPage />} />

        {/* Authenticated app routes. */}
        <Route path="/matches" element={<RequireAuth><MatchesPage /></RequireAuth>} />
        <Route path="/matches/:id" element={<RequireAuth><MatchDetailPage /></RequireAuth>} />
        <Route path="/chats" element={<RequireAuth><ChatsPage /></RequireAuth>} />
        <Route path="/chats/:id" element={<RequireAuth><ChatPage /></RequireAuth>} />
        <Route path="/reviews/me" element={<RequireAuth><MyReviewsPage /></RequireAuth>} />
        <Route path="/reviews/write/:id" element={<RequireAuth><WriteReviewPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

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

function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
      <div className="serif text-6xl md:text-7xl text-sage-700 mb-4">404</div>
      <p className="text-ink-500">That page doesn't exist (yet).</p>
    </div>
  );
}
