import { useAuthStore } from '../lib/auth';
import HelperOnboarding from './onboarding/HelperOnboarding';
import EmployerOnboarding from './onboarding/EmployerOnboarding';

/**
 * Role dispatcher: helpers see the helper wizard, employers see the employer
 * wizard. Sprint A treats /profile as "edit your own profile"; Sprint B will
 * promote completed profiles into a more polished view + edit experience.
 */
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 md:px-6 py-20 text-center text-ink-500">Loading…</div>
    );
  }

  if (user.role === 'HELPER') return <HelperOnboarding />;
  if (user.role === 'EMPLOYER') return <EmployerOnboarding />;

  // Admins/agencies don't have a self-profile flow yet.
  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-20 text-center text-ink-500">
      <h1 className="serif text-2xl text-sage-900 mb-2">No profile flow for {user.role.toLowerCase()} yet</h1>
      <p>Admin and agency tools live on the admin console.</p>
    </div>
  );
}
