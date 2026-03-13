import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SideNav.css';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { path: '/calendar', label: 'Calendar', icon: '📅', roles: ['admin', 'coach', 'viewer'] },
  { path: '/bookings', label: 'Bookings', icon: '📝', roles: ['admin', 'coach'] },
  { path: '/teams', label: 'Teams', icon: '👥', roles: ['admin'] },
];

export default function SideNav() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const userRole = user?.role ?? 'viewer';

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <nav className={`sidenav ${collapsed ? 'sidenav-collapsed' : ''}`}>
      <div className="sidenav-items">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidenav-link ${isActive ? 'sidenav-link-active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="sidenav-icon">{item.icon}</span>
            {!collapsed && <span className="sidenav-label">{item.label}</span>}
          </NavLink>
        ))}
      </div>

      <button
        className="sidenav-toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </nav>
  );
}
