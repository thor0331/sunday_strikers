import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, CalendarCheck, Home, Trophy, Users, User, Swords, BookOpen, Award, Zap } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/my-dashboard', label: 'My Stats', icon: User },
  { to: '/availability', label: 'Availability', icon: CalendarCheck },
  { to: '/matches', label: 'Matches', icon: Trophy },
  { to: '/leaderboards', label: 'Leaders', icon: BarChart3 }
];

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-teal-600">🏏 Sunday Strikers</h1>
          <div className="flex gap-0.5 sm:gap-1">
            <NavLink to="/teams" className="text-[10px] font-semibold text-slate-400 hover:text-teal-600 transition-colors px-1.5 sm:px-2 py-1 rounded hover:bg-teal-50">
              <Swords className="w-3 h-3 inline mr-0.5" />Teams
            </NavLink>
            <NavLink to="/awards" className="text-[10px] font-semibold text-slate-400 hover:text-teal-600 transition-colors px-1.5 sm:px-2 py-1 rounded hover:bg-teal-50">
              <Award className="w-3 h-3 inline mr-0.5" />Awards
            </NavLink>
            <NavLink to="/records" className="text-[10px] font-semibold text-slate-400 hover:text-teal-600 transition-colors px-1.5 sm:px-2 py-1 rounded hover:bg-teal-50">
              <BookOpen className="w-3 h-3 inline mr-0.5" />Records
            </NavLink>
            <NavLink to="/season-summary" className="text-[10px] font-semibold text-slate-400 hover:text-teal-600 transition-colors px-1.5 sm:px-2 py-1 rounded hover:bg-teal-50">
              <Zap className="w-3 h-3 inline mr-0.5" />Season
            </NavLink>
            <NavLink to="/hall-of-fame" className="text-[10px] font-semibold text-slate-400 hover:text-teal-600 transition-colors px-1.5 sm:px-2 py-1 rounded hover:bg-teal-50 hidden sm:inline-flex">
              HoF
            </NavLink>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'} transition-colors`}>
              <item.icon className="h-5 w-5" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
