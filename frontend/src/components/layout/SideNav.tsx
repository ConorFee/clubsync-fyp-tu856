import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Building2,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import './SideNav.css';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

const navItems: NavItem[] = [
  { path: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, roles: ['admin', 'coach', 'viewer'] },
  { path: '/calendar',   label: 'Calendar',   icon: Calendar,        roles: ['admin', 'coach', 'viewer'] },
  { path: '/requests',   label: 'Requests',   icon: FileText,        roles: ['admin', 'coach'] },
  { path: '/facilities', label: 'Facilities', icon: Building2,       roles: ['admin'] },
  { path: '/reports',    label: 'Reports',    icon: BarChart3,       roles: ['admin'] },
  { path: '/settings',   label: 'Settings',   icon: Settings,        roles: ['admin'] },
];

export default function SideNav() {
  const { user } = useAuth();
  const userRole = user?.role ?? 'viewer';

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <nav className="sidenav">
      <div className="sidenav-items">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidenav-link ${isActive ? 'sidenav-link-active' : ''}`
              }
            >
              <Icon size={20} className="sidenav-icon" />
              <span className="sidenav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
