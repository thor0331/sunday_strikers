import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from './animations';

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  links: SidebarLink[];
  title?: string;
}

export function Sidebar({ links, title = 'Admin' }: SidebarProps) {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-white/10 bg-[#0F1B2D]">
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <h1 className="text-base font-bold text-white">{title}</h1>
      </div>
      <motion.nav
        className="flex-1 space-y-1 p-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {links.map((link) => (
          <motion.div key={link.to} variants={fadeInUp}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent-green/15 text-accent-green shadow-sm'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }`
              }
            >
              <link.icon className="h-5 w-5 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>
    </aside>
  );
}
