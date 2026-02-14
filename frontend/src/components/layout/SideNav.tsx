import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './SideNav.css';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/calendar', label: 'Calendar', icon: '📅' },
  { path: '/bookings', label: 'Bookings', icon: '📝' },
  { path: '/requests', label: 'Requests', icon: '📋', adminOnly: true },
  { path: '/teams', label: 'Teams', icon: '👥', adminOnly: true },
];

export default function SideNav() {
  const [collapsed, setCollapsed] = useState(false);

  // Phase 2 (Week 4): Get role from auth context
  // For now, show all items (admin view)
  const userRole = 'admin';

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'admin'
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
