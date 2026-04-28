import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { HelperHavenWordmark } from './Logo';
import { useAuthStore } from '../lib/auth';

/**
 * Top-level app shell. Responsive nav: full menu on md+, hamburger drawer on mobile.
 * Used by every authenticated page; the public landing renders its own hero nav.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuthStore();
  const loc = useLocation();

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
                <NavLink to="/matches" className={navLinkCls}>Matches</NavLink>
                <NavLink to="/chats" className={navLinkCls}>Chats</NavLink>
                <NavLink to="/profile" className={navLinkCls}>My profile</NavLink>
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
                  <NavLink to="/matches" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">Matches</NavLink>
                  <NavLink to="/chats" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">Chats</NavLink>
                  <NavLink to="/profile" onClick={() => setOpen(false)} className="py-3 px-2 rounded-lg hover:bg-cream-200">My profile</NavLink>
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
