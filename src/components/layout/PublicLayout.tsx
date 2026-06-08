import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, CalendarCheck, Home, Trophy, Users } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/availability', label: 'Availability', icon: CalendarCheck },
  { to: '/matches', label: 'Matches', icon: Trophy },
  { to: '/leaderboards', label: 'Leaders', icon: BarChart3 }
];

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold text-ink">Sunday Strikers</h1>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-4">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${isActive ? 'text-field' : 'text-slate-500'}`}>
              <item.icon className="h-5 w-5" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
