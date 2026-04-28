import { Link, Route, Routes } from 'react-router-dom';
import VerificationQueue from './pages/VerificationQueue';
import PermitCases from './pages/PermitCases';
import Reports from './pages/Reports';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-slate-950 border-r border-slate-800 p-4">
        <h1 className="text-xl font-semibold mb-6">HelperHaven <span className="text-slate-500">admin</span></h1>
        <nav className="flex flex-col gap-1 text-sm">
          <NavItem to="/">Dashboard</NavItem>
          <NavItem to="/verification">Verification queue</NavItem>
          <NavItem to="/permits">Permit cases</NavItem>
          <NavItem to="/reports">User reports</NavItem>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/verification" element={<VerificationQueue />} />
          <Route path="/permits" element={<PermitCases />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="px-3 py-2 rounded hover:bg-slate-800 text-slate-300">
      {children}
    </Link>
  );
}
