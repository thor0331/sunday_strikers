import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../forms/Button';
import { useSignOut } from '../../hooks/useAuth';

const adminLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/players', label: 'Players' },
  { to: '/admin/seasons', label: 'Seasons' },
  { to: '/admin/matches/new', label: 'New Match' }
];

export function AdminLayout() {
  const signOut = useSignOut();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold">Admin</h1>
          <Button type="button" variant="secondary" onClick={() => void signOut.mutateAsync()}>
            Logout
          </Button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto">
          {adminLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `shrink-0 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-field text-white' : 'bg-slate-100 text-slate-700'}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
