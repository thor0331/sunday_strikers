import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, CalendarRange, PlusCircle, LogOut, LayoutGrid, Wrench } from 'lucide-react';
import { Button } from '../forms/Button';
import { Sidebar } from '../ui/Sidebar';
import { useSignOut } from '../../hooks/useAuth';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/players', label: 'Players', icon: Users },
  { to: '/admin/seasons', label: 'Seasons', icon: CalendarRange },
  { to: '/admin/matches/new', label: 'New Match', icon: PlusCircle },
  { to: '/admin/content', label: 'Site Content', icon: LayoutGrid },
  { to: '/admin/maintenance', label: 'Maintenance', shortLabel: 'Tools', icon: Wrench }
];

export function AdminLayout() {
  const signOut = useSignOut();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-[#07111F]">
      <div className="hidden md:block">
        <Sidebar links={adminLinks} title="Admin" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-[#07111F]/80 px-4 backdrop-blur-xl md:hidden">
          <h1 className="text-base font-bold text-white">Admin</h1>
          <Button variant="ghost" size="sm" onClick={() => void signOut.mutateAsync()} className="h-9">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </header>
        <main className="page-container min-w-0 flex-1 overflow-x-clip p-4 pb-24 md:p-6 md:pb-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0F1B2D]/95 backdrop-blur-xl md:hidden">
          <div className="pb-safe grid grid-cols-6">
            {adminLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                    isActive ? 'text-accent-green' : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <item.icon className="mb-0.5 h-5 w-5" aria-hidden />
                <span className="max-w-full truncate px-0.5 text-center leading-none">{item.shortLabel ?? item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
