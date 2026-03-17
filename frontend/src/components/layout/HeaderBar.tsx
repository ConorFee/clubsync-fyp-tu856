import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut } from 'lucide-react';
import './HeaderBar.css';

export default function HeaderBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const displayName = user
    ? user.first_name || user.username
    : 'User';

  const initials = user
    ? `${(user.first_name?.[0] ?? '').toUpperCase()}${(user.last_name?.[0] ?? '').toUpperCase()}` || user.username[0].toUpperCase()
    : 'U';

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : '';

  return (
    <header className="header-bar">
      <div className="header-left">
        <div className="header-cs-logo">CS</div>
        <span className="header-brand">ClubSync</span>
      </div>

      <div className="header-right">
        <button className="header-bell" aria-label="Notifications">
          <Bell size={20} />
          <span className="header-bell-dot" />
        </button>

        <div className="header-user">
          <div className="header-avatar">{initials}</div>
          <div className="header-user-info">
            <span className="header-username">{displayName}</span>
            <span className="header-userrole">{roleLabel}</span>
          </div>
        </div>

        <button className="header-logout" onClick={handleLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
