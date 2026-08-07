import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, BarChart3, BookOpen, CalendarCheck, Home, Info, Medal, Swords, Trophy, User, Zap } from 'lucide-react';
import { Footer } from '../common/Footer';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/my-dashboard', label: 'My Stats', icon: User },
  { to: '/availability', label: 'Availability', icon: CalendarCheck },
  { to: '/matches', label: 'Matches', icon: Trophy },
  { to: '/hall-of-fame', label: 'Hall of Fame', icon: Medal }
];

const headerLinks = [
  { to: '/teams', label: 'Teams', icon: Swords },
  { to: '/awards', label: 'Awards', icon: Award },
  { to: '/records', label: 'Records', icon: BookOpen },
  { to: '/season-summary', label: 'Season', icon: Zap },
  { to: '/leaderboards', label: 'Leaders', icon: BarChart3 },
  { to: '/about', label: 'About', icon: Info }
];

export function PublicLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#07111F] pb-20">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07111F]/80 px-3 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 md:max-w-6xl xl:max-w-7xl">
          <h1 className="shrink-0 text-lg font-bold text-white">Sunday Strikers</h1>
          <nav className="no-scrollbar flex flex-1 gap-1 overflow-x-auto pl-2">
            {headerLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-accent-green' : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <link.icon className="h-3 w-3" aria-hidden />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="page-container mx-auto w-full max-w-3xl px-4 py-4 md:max-w-6xl md:px-6 md:py-6 xl:max-w-7xl">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
      <Footer />
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0F1B2D]/95 backdrop-blur-xl">
        <div className="pb-safe page-container mx-auto grid max-w-3xl grid-cols-5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors ${
                  isActive ? 'text-accent-green' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
